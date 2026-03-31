import { buildFallbackUsername, sanitizeUsername } from '@/lib/onboarding/onboardingDraftStore';

type AuthUserLike = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function readUserMetadataString(
  user: AuthUserLike | null | undefined,
  keys: readonly string[]
): string {
  const metadata = user?.user_metadata ?? {};

  for (const key of keys) {
    const value = metadata[key];
    if (typeof value !== 'string') continue;

    const trimmed = value.trim();
    if (trimmed) {
      return trimmed;
    }
  }

  return '';
}

export { buildFallbackUsername, sanitizeUsername };

export function getAuthBootstrapUsername(
  user: AuthUserLike | null | undefined,
  fallbackUserId?: string
): string {
  const userId = fallbackUserId ?? user?.id ?? '';
  const metadataUsername = sanitizeUsername(
    readUserMetadataString(user, ['username', 'Username'])
  );

  if (metadataUsername.length >= 3) {
    return metadataUsername;
  }

  return buildFallbackUsername(user?.email, userId);
}

export function getAuthBootstrapDisplayName(
  user: AuthUserLike | null | undefined,
  username: string
): string {
  const displayName = readUserMetadataString(user, ['display_name', 'displayName', 'full_name']);
  return displayName || username;
}
