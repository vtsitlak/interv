import type { User } from 'firebase/auth';

export function userHasPasswordProvider(user: User | null | undefined): boolean {
  return user?.providerData.some((p) => p.providerId === 'password') ?? false;
}

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

const FIREBASE_AUTH_MESSAGES: Record<string, string> = {
  'auth/invalid-credential':
    'Invalid email or password. If you signed up with Google, use Continue with Google.',
  'auth/invalid-login-credentials':
    'Invalid email or password. If you signed up with Google, use Continue with Google.',
  'auth/user-not-found':
    'No account found with this email. Check the address or create an account.',
  'auth/wrong-password': 'Incorrect password. Try again or reset your password.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/email-already-in-use':
    'An account already exists with this email. Sign in instead, or use Continue with Google if you registered with Google.',
  'auth/account-exists-with-different-credential':
    'This email is already linked to Google. Use Continue with Google to sign in.',
  'auth/weak-password': 'Password is too weak. Use at least 6 characters.',
  'auth/too-many-requests':
    'Too many attempts. Wait a moment and try again.',
  'auth/requires-recent-login':
    'For security, sign out and sign in again, then try changing your password.',
  'auth/missing-password': 'Enter your current password.',
  'auth/credential-already-in-use':
    'This email is already linked to another sign-in method.',
  'auth/provider-already-linked': 'A password is already set for this account.',
  'auth/popup-closed-by-user': 'Sign-in was cancelled. Try again when you are ready.',
  'auth/cancelled-popup-request': 'Sign-in was cancelled. Try again when you are ready.',
};

export function firebaseErrorMessage(e: unknown): string {
  const code = firebaseAuthErrorCode(e);
  if (code && FIREBASE_AUTH_MESSAGES[code]) {
    return FIREBASE_AUTH_MESSAGES[code];
  }
  if (e instanceof Error && e.message.trim()) {
    return e.message;
  }
  return 'Something went wrong. Please try again.';
}

export function firebaseAuthErrorCode(e: unknown): string | undefined {
  if (typeof e !== 'object' || e === null || !('code' in e)) {
    return undefined;
  }
  const code = (e as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
