/** Public profile handle rules (URL segment under `/candidate/:username`). */

export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;

/** Lowercase letters, digits, hyphens; no leading/trailing hyphen. */
export const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,28}[a-z0-9])?$/;

/**
 * Route segments and common words that must not be claimable as usernames.
 * Keep in sync with `src/app/app.routes.ts` under `/candidate`.
 */
export const RESERVED_USERNAMES = new Set([
  'account',
  'dashboard',
  'train-profile',
  'my-profile',
  'test-interview',
  'interview',
  'feedback',
  'login',
  'register',
  'profile',
  'api',
  'admin',
  'settings',
  'help',
  'about',
  'null',
  'undefined',
  'me',
  'new',
  'edit',
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isReservedUsername(normalized: string): boolean {
  return RESERVED_USERNAMES.has(normalized);
}

/** Returns a user-facing error, or `null` when the username format is valid. */
export function usernameFormatError(raw: string): string | null {
  const normalized = normalizeUsername(raw);
  if (!normalized) {
    return 'Username is required';
  }
  if (normalized.length < USERNAME_MIN_LENGTH) {
    return `Username must be at least ${USERNAME_MIN_LENGTH} characters`;
  }
  if (normalized.length > USERNAME_MAX_LENGTH) {
    return `Username must be at most ${USERNAME_MAX_LENGTH} characters`;
  }
  if (!USERNAME_PATTERN.test(normalized)) {
    return 'Use only lowercase letters, numbers, and hyphens (no spaces or symbols)';
  }
  if (isReservedUsername(normalized)) {
    return 'That username is reserved. Choose another.';
  }
  return null;
}

export function isValidUsernameFormat(raw: string): boolean {
  return usernameFormatError(raw) === null;
}

export function publicSharePathForUsername(username: string): string {
  return `/candidate/${normalizeUsername(username)}`;
}
