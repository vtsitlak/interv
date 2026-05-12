import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthFacade } from './auth.facade';
import { AuthStore } from './auth.store';

describe('AuthFacade', () => {
  let storeMock: {
    user: ReturnType<typeof vi.fn>;
    loading: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    loginWithGoogle: ReturnType<typeof vi.fn>;
    logout: ReturnType<typeof vi.fn>;
    setUser: ReturnType<typeof vi.fn>;
    clearError: ReturnType<typeof vi.fn>;
    tryHandleRedirectResult: ReturnType<typeof vi.fn>;
  };
  let navigate: ReturnType<typeof vi.fn>;
  let facade: AuthFacade;

  beforeEach(() => {
    storeMock = {
      user: vi.fn().mockReturnValue(null),
      loading: vi.fn().mockReturnValue(false),
      error: vi.fn().mockReturnValue(null),
      isAuthenticated: vi.fn().mockReturnValue(false),
      login: vi.fn().mockResolvedValue(undefined),
      register: vi.fn().mockResolvedValue(undefined),
      loginWithGoogle: vi.fn().mockResolvedValue(undefined),
      logout: vi.fn().mockResolvedValue(undefined),
      setUser: vi.fn(),
      clearError: vi.fn(),
      tryHandleRedirectResult: vi.fn().mockResolvedValue(undefined),
    };

    navigate = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        AuthFacade,
        { provide: AuthStore, useValue: storeMock },
        { provide: Router, useValue: { navigate } },
      ],
    });

    facade = TestBed.inject(AuthFacade);
  });

  it('login() navigates to /dashboard when sign-in succeeds', async () => {
    storeMock.user.mockReturnValue({
      uid: 'u1',
      email: 'a@b.com',
      displayName: null,
    });

    await facade.login('a@b.com', 'pwd');

    expect(storeMock.login).toHaveBeenCalledWith('a@b.com', 'pwd');
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('login() does not navigate when no user is set', async () => {
    storeMock.user.mockReturnValue(null);

    await facade.login('a@b.com', 'pwd');

    expect(navigate).not.toHaveBeenCalled();
  });

  it('logout() always navigates to /login', async () => {
    await facade.logout();

    expect(storeMock.logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('setUser() delegates to the store', () => {
    facade.setUser({ uid: 'x', email: null, displayName: null });

    expect(storeMock.setUser).toHaveBeenCalledWith({
      uid: 'x',
      email: null,
      displayName: null,
    });
  });
});
