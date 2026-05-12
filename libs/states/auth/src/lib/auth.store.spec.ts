import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';

const fakeUser = {
  uid: 'u1',
  email: 'e@test.com',
  displayName: 'Eve',
};

describe('AuthStore', () => {
  let authService: Pick<
    AuthService,
    | 'loginWithEmail'
    | 'registerWithEmail'
    | 'updateDisplayName'
    | 'loginWithGooglePopup'
    | 'loginWithGoogleRedirect'
    | 'getRedirectResult'
    | 'logout'
  >;
  let store: InstanceType<typeof AuthStore>;

  beforeEach(() => {
    authService = {
      loginWithEmail: vi.fn().mockResolvedValue({ user: fakeUser }),
      registerWithEmail: vi.fn().mockResolvedValue({ user: fakeUser }),
      updateDisplayName: vi.fn().mockResolvedValue(undefined),
      loginWithGooglePopup: vi.fn().mockResolvedValue({ user: fakeUser }),
      loginWithGoogleRedirect: vi.fn().mockResolvedValue(undefined),
      getRedirectResult: vi.fn().mockResolvedValue(null),
      logout: vi.fn().mockResolvedValue(undefined),
    };

    TestBed.configureTestingModule({
      providers: [
        AuthStore,
        { provide: AuthService, useValue: authService },
      ],
    });

    store = TestBed.inject(AuthStore);
  });

  it('login() stores the returned user and clears loading', async () => {
    await store.login('e@test.com', 'pwd');

    expect(authService.loginWithEmail).toHaveBeenCalledWith(
      'e@test.com',
      'pwd',
    );
    expect(store.user()).toEqual({
      uid: 'u1',
      email: 'e@test.com',
      displayName: 'Eve',
    });
    expect(store.loading()).toBe(false);
    expect(store.isAuthenticated()).toBe(true);
  });

  it('login() sets error and clears loading on failure', async () => {
    vi.mocked(authService.loginWithEmail).mockRejectedValueOnce(
      new Error('bad creds'),
    );

    await store.login('e@test.com', 'pwd');

    expect(store.user()).toBeNull();
    expect(store.error()).toBe('bad creds');
    expect(store.loading()).toBe(false);
  });

  it('register() applies the display name and stores the user', async () => {
    await store.register('Ada', 'a@b.com', 'secret');

    expect(authService.registerWithEmail).toHaveBeenCalledWith(
      'a@b.com',
      'secret',
    );
    expect(authService.updateDisplayName).toHaveBeenCalledWith(fakeUser, 'Ada');
    expect(store.user()?.displayName).toBe('Ada');
  });

  it('loginWithGoogle() falls back to redirect when popup is blocked', async () => {
    vi.mocked(authService.loginWithGooglePopup).mockRejectedValueOnce(
      Object.assign(new Error('blocked'), { code: 'auth/popup-blocked' }),
    );

    await store.loginWithGoogle();

    expect(authService.loginWithGoogleRedirect).toHaveBeenCalled();
    expect(store.error()).toBeNull();
  });

  it('logout() clears the user', async () => {
    await store.login('e@test.com', 'pwd');
    await store.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(store.user()).toBeNull();
    expect(store.isAuthenticated()).toBe(false);
  });

  it('setUser() updates the user signal directly', () => {
    store.setUser({ uid: 'x', email: 'x@x', displayName: 'X' });

    expect(store.user()?.uid).toBe('x');
  });
});
