import type { User } from 'firebase/auth';

export interface ProfileUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface NewUser {
  name: string;
  email: string;
  password: string;
}

import type { UserRole } from './account.service';

export interface AuthState {
  user: ProfileUser | null;
  role: UserRole | null;
  loading: boolean;
  error: string | null;
}

export const authInitialState: AuthState = {
  user: null,
  role: null,
  loading: false,
  error: null,
};

/**
 * Firebase pop-up failure codes that should fall back to a full-page redirect
 * (rather than surfacing a user-visible error).
 */
export const GOOGLE_POPUP_FALLBACK_CODES = new Set([
  'auth/popup-blocked',
  'auth/cancelled-popup-request',
  'auth/operation-not-supported-in-this-environment',
  'auth/internal-error',
]);

export function toProfileUser(user: User | null): ProfileUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
  };
}

export function firebaseErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export function firebaseAuthErrorCode(e: unknown): string | undefined {
  if (typeof e !== 'object' || e === null || !('code' in e)) {
    return undefined;
  }
  const code = (e as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
