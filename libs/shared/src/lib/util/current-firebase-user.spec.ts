import { Auth, authState } from '@angular/fire/auth';
import type { User } from 'firebase/auth';
import { of, timer } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { currentFirebaseUserOrNull } from './current-firebase-user';

vi.mock('@angular/fire/auth', () => ({
  Auth: class Auth {},
  authState: vi.fn(() => of(null)),
}));

describe('currentFirebaseUserOrNull', () => {
  beforeEach(() => {
    vi.mocked(authState).mockReset();
  });

  it('returns auth.currentUser when already hydrated', async () => {
    const user = { uid: 'u1' } as User;
    const auth = { currentUser: user } as Auth;

    await expect(currentFirebaseUserOrNull(auth)).resolves.toBe(user);
    expect(authState).not.toHaveBeenCalled();
  });

  it('waits for authState when currentUser is null', async () => {
    const user = { uid: 'u2' } as User;
    const auth = { currentUser: null } as Auth;
    vi.mocked(authState).mockReturnValue(of(user));

    await expect(currentFirebaseUserOrNull(auth)).resolves.toBe(user);
  });

  it('returns null when authState does not emit in time', async () => {
    const auth = { currentUser: null } as Auth;
    vi.mocked(authState).mockReturnValue(timer(10_000));

    await expect(currentFirebaseUserOrNull(auth, 20)).resolves.toBeNull();
  });
});
