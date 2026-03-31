// @ts-nocheck
/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

const DELETE_ACCOUNT_CONFIRMATION_TEXT = 'DELETE MY ACCOUNT';
const PROFILE_PHOTOS_BUCKET = 'profile-photos';
const STORAGE_BATCH_SIZE = 1000;
const STORAGE_OWNER_COLUMNS = ['owner_id', 'owner'];

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: corsHeaders,
  });
}

function toCleanString(value: unknown) {
  return String(value ?? '').trim();
}

function getSupabaseEnv(name: string) {
  return (
    Deno.env.get(name) ??
    Deno.env.get(`EXPO_PUBLIC_${name}`) ??
    Deno.env.get(name.replace(/^SUPABASE_/, ''))
  );
}

function isMissingBucketError(error: unknown) {
  const message = toCleanString((error as { message?: unknown } | null)?.message).toLowerCase();
  return message.includes('bucket not found');
}

function formatDeleteUserError(error: { message?: unknown } | null | undefined) {
  const message = toCleanString(error?.message);
  if (!message) {
    return 'Failed to delete user.';
  }

  if (message === 'Database error deleting user') {
    return [
      'Database error deleting user.',
      'The hosted project still has a database-side delete blocker outside the app client.',
      'Check the delete-account function logs and run a rollback delete probe in SQL Editor to get the exact Postgres error.',
    ].join(' ');
  }

  return message;
}

function isMissingStorageColumnError(error: unknown, columnName: string) {
  const message = toCleanString((error as { message?: unknown } | null)?.message).toLowerCase();
  if (!message) {
    return false;
  }

  return (
    message.includes(columnName.toLowerCase()) &&
    (message.includes('does not exist') || message.includes('not found'))
  );
}

function isMissingStorageObjectError(error: unknown) {
  const message = toCleanString((error as { message?: unknown } | null)?.message).toLowerCase();
  return (
    message.includes('not found') ||
    message.includes('no such key') ||
    message.includes('resource was not found')
  );
}

function isStorageFolderEntry(row: { id?: unknown } | null | undefined) {
  return !toCleanString(row?.id);
}

function joinStoragePath(prefix: string, name: string) {
  return prefix ? `${prefix}/${name}` : name;
}

function addObjectPath(
  groupedPaths: Map<string, Set<string>>,
  bucketName: string | null | undefined,
  objectPath: string | null | undefined
) {
  const normalizedBucket = toCleanString(bucketName);
  const normalizedPath = toCleanString(objectPath);

  if (!normalizedBucket || !normalizedPath) {
    return;
  }

  const bucketPaths = groupedPaths.get(normalizedBucket) ?? new Set<string>();
  bucketPaths.add(normalizedPath);
  groupedPaths.set(normalizedBucket, bucketPaths);
}

async function getAuthedUser(req: Request, supabaseUrl: string, supabaseAnonKey: string) {
  const authorization = req.headers.get('Authorization');
  if (!authorization) {
    throw new HttpError(401, 'Missing authorization header.');
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if (error || !user) {
    throw new HttpError(401, 'Unable to verify the current user.');
  }

  return user;
}

async function readRequestBody(req: Request) {
  let payload: unknown = null;

  try {
    payload = await req.json();
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.');
  }

  const confirmation =
    payload && typeof payload === 'object' && !Array.isArray(payload)
      ? toCleanString((payload as Record<string, unknown>).confirmation)
      : '';

  if (confirmation !== DELETE_ACCOUNT_CONFIRMATION_TEXT) {
    throw new HttpError(
      400,
      `Confirmation text must exactly match "${DELETE_ACCOUNT_CONFIRMATION_TEXT}".`
    );
  }
}

async function collectOwnedStorageObjects(adminClient: ReturnType<typeof createClient>, userId: string) {
  const groupedPaths = new Map<string, Set<string>>();

  // Storage ownership moved from `owner` to `owner_id`; query both so deletion works on
  // projects that are mid-upgrade and still need all owned objects removed before auth deletion.
  for (const ownerColumn of STORAGE_OWNER_COLUMNS) {
    let from = 0;

    while (true) {
      const { data, error } = await adminClient
        .schema('storage')
        .from('objects')
        .select('bucket_id,name')
        .eq(ownerColumn, userId)
        .range(from, from + STORAGE_BATCH_SIZE - 1);

      if (error) {
        if (isMissingStorageColumnError(error, ownerColumn)) {
          break;
        }

        console.warn(`[delete-account] Failed to query storage.objects by ${ownerColumn}`, error);
        break;
      }

      const rows = Array.isArray(data) ? data : [];
      if (!rows.length) {
        break;
      }

      for (const row of rows) {
        addObjectPath(groupedPaths, row.bucket_id, row.name);
      }

      if (rows.length < STORAGE_BATCH_SIZE) {
        break;
      }

      from += rows.length;
    }
  }

  return groupedPaths;
}

async function collectPrefixPaths(
  adminClient: ReturnType<typeof createClient>,
  groupedPaths: Map<string, Set<string>>,
  bucketName: string,
  prefix: string
) {
  const normalizedBucket = toCleanString(bucketName);
  const normalizedPrefix = toCleanString(prefix);

  if (!normalizedBucket || !normalizedPrefix) {
    return;
  }

  const pendingPrefixes = [normalizedPrefix];
  const visitedPrefixes = new Set<string>();

  while (pendingPrefixes.length) {
    const currentPrefix = pendingPrefixes.pop();
    if (!currentPrefix || visitedPrefixes.has(currentPrefix)) {
      continue;
    }

    visitedPrefixes.add(currentPrefix);
    let offset = 0;

    while (true) {
      const { data, error } = await adminClient.storage.from(normalizedBucket).list(currentPrefix, {
        limit: STORAGE_BATCH_SIZE,
        offset,
        sortBy: { column: 'name', order: 'asc' },
      });

      if (error) {
        if (isMissingBucketError(error)) {
          return;
        }

        throw new HttpError(500, `Failed to inspect storage bucket "${normalizedBucket}".`);
      }

      const rows = Array.isArray(data) ? data : [];
      if (!rows.length) {
        break;
      }

      for (const row of rows) {
        const rowName = toCleanString(row.name);
        if (!rowName) {
          continue;
        }

        const rowPath = joinStoragePath(currentPrefix, rowName);
        if (isStorageFolderEntry(row)) {
          pendingPrefixes.push(rowPath);
          continue;
        }

        addObjectPath(groupedPaths, normalizedBucket, rowPath);
      }

      if (rows.length < STORAGE_BATCH_SIZE) {
        break;
      }

      offset += rows.length;
    }
  }
}

async function deleteStorageObjects(
  adminClient: ReturnType<typeof createClient>,
  groupedPaths: Map<string, Set<string>>
) {
  for (const [bucketName, bucketPaths] of groupedPaths.entries()) {
    const paths = Array.from(bucketPaths);
    if (!paths.length) {
      continue;
    }

    for (let index = 0; index < paths.length; index += STORAGE_BATCH_SIZE) {
      const chunk = paths.slice(index, index + STORAGE_BATCH_SIZE);
      const { error } = await adminClient.storage.from(bucketName).remove(chunk);

      if (error) {
        if (isMissingBucketError(error)) {
          continue;
        }

        if (isMissingStorageObjectError(error)) {
          for (const path of chunk) {
            const { error: singleError } = await adminClient.storage.from(bucketName).remove([path]);

            if (!singleError || isMissingBucketError(singleError)) {
              continue;
            }

            if (isMissingStorageObjectError(singleError)) {
              continue;
            }

            throw new HttpError(500, `Failed to delete files from storage bucket "${bucketName}".`);
          }

          continue;
        }

        throw new HttpError(500, `Failed to delete files from storage bucket "${bucketName}".`);
      }
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  try {
    const supabaseUrl = getSupabaseEnv('SUPABASE_URL');
    const supabaseAnonKey = getSupabaseEnv('SUPABASE_ANON_KEY');
    const serviceRoleKey = getSupabaseEnv('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      throw new HttpError(500, 'Supabase function environment is not configured correctly.');
    }

    await readRequestBody(req);

    const user = await getAuthedUser(req, supabaseUrl, supabaseAnonKey);
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const groupedPaths = await collectOwnedStorageObjects(adminClient, user.id);
    const nutritionBucket =
      getSupabaseEnv('SUPABASE_NUTRITION_SUBMISSIONS_BUCKET') ?? PROFILE_PHOTOS_BUCKET;

    await Promise.all([
      collectPrefixPaths(adminClient, groupedPaths, PROFILE_PHOTOS_BUCKET, user.id),
      collectPrefixPaths(
        adminClient,
        groupedPaths,
        nutritionBucket,
        `nutrition-submissions/${user.id}`
      ),
    ]);

    await deleteStorageObjects(adminClient, groupedPaths);

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id, false);
    if (deleteError) {
      console.error('[delete-account] Failed to delete auth user', deleteError);
      throw new HttpError(500, formatDeleteUserError(deleteError));
    }

    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    console.error('[delete-account] Unexpected failure', error);
    return jsonResponse({ error: 'Unexpected error while deleting account.' }, 500);
  }
});
