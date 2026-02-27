// lib/storage.ts
import * as FileSystem from 'expo-file-system/legacy';
import { decode as base64Decode } from 'base64-arraybuffer';
import { supabase } from '@/lib/supabase';

import { requireAuthedUserId } from './auth';
import { formatSupabaseishError, normalizeThrown } from './errors';

const BUCKET = 'profile-photos';

function getImageContentType(fileExt: string) {
  switch (fileExt.toLowerCase()) {
    case 'png':
      return 'image/png';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    case 'heic':
      return 'image/heic';
    case 'heif':
      return 'image/heif';
    case 'jpg':
    case 'jpeg':
    default:
      return 'image/jpeg';
  }
}

export async function uploadMyProfilePhotoFromUri(localUri: string): Promise<string> {
  const userId = await requireAuthedUserId();

  const fileExt = localUri.split('.').pop()?.split('?')[0] || 'jpg';
  const fileName = `${userId}-${Date.now()}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const base64 = await FileSystem.readAsStringAsync(localUri, { encoding: 'base64' });
  const arrayBuffer = base64Decode(base64);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, arrayBuffer, {
      upsert: true,
      contentType: getImageContentType(fileExt),
    });

  if (uploadError) throw normalizeThrown(uploadError, formatSupabaseishError(uploadError));

  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
  return publicUrlData.publicUrl;
}
