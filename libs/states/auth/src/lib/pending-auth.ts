import {
  PENDING_AUTH_STORAGE_KEY,
  type PendingAuthContext,
} from './auth-audience';

export function setPendingAuth(context: PendingAuthContext): void {
  sessionStorage.setItem(PENDING_AUTH_STORAGE_KEY, JSON.stringify(context));
}

export function consumePendingAuth(): PendingAuthContext | null {
  const raw = sessionStorage.getItem(PENDING_AUTH_STORAGE_KEY);
  sessionStorage.removeItem(PENDING_AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as PendingAuthContext;
  } catch {
    return null;
  }
}
