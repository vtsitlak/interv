import { describe, expect, it } from 'vitest';
import {
  firebaseAuthErrorCode,
  firebaseErrorMessage,
  userHasPasswordProvider,
} from './auth.models';

describe('firebaseErrorMessage', () => {
  it('maps invalid-credential to a friendly login message', () => {
    const err = Object.assign(new Error('Firebase: Error'), {
      code: 'auth/invalid-credential',
    });
    expect(firebaseErrorMessage(err)).toContain('Google');
  });

  it('maps email-already-in-use to a friendly register message', () => {
    const err = Object.assign(new Error('Firebase: Error'), {
      code: 'auth/email-already-in-use',
    });
    expect(firebaseErrorMessage(err)).toContain('already exists');
  });

  it('falls back to Error.message when code is unknown', () => {
    expect(firebaseErrorMessage(new Error('custom failure'))).toBe(
      'custom failure',
    );
  });

  it('returns a generic message for unknown errors', () => {
    expect(firebaseErrorMessage('oops')).toBe('Something went wrong. Please try again.');
  });
});

describe('userHasPasswordProvider', () => {
  it('returns true when password provider is linked', () => {
    const user = {
      providerData: [{ providerId: 'google.com' }, { providerId: 'password' }],
    };
    expect(userHasPasswordProvider(user as never)).toBe(true);
  });

  it('returns false for Google-only accounts', () => {
    const user = { providerData: [{ providerId: 'google.com' }] };
    expect(userHasPasswordProvider(user as never)).toBe(false);
  });
});

describe('firebaseAuthErrorCode', () => {
  it('reads the code from Firebase-shaped errors', () => {
    const err = { code: 'auth/user-not-found' };
    expect(firebaseAuthErrorCode(err)).toBe('auth/user-not-found');
  });
});
