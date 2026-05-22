import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { ProfileFacade } from '@interv/state-profile';
import { RecruiterFacade } from '@interv/state-recruiter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountService } from './account.service';
import { AuthService } from './auth.service';
import { AuthFacade } from './auth.facade';
import { AuthStore } from './auth.store';

describe('AuthFacade', () => {
  let storeMock: {
    user: ReturnType<typeof vi.fn>;
    loading: ReturnType<typeof vi.fn>;
    error: ReturnType<typeof vi.fn>;
    isAuthenticated: ReturnType<typeof vi.fn>;
    isRecruiter: ReturnType<typeof vi.fn>;
    login: ReturnType<typeof vi.fn>;
    register: ReturnType<typeof vi.fn>;
    loginWithGoogle: ReturnType<typeof vi.fn>;
    validateAudience: ReturnType<typeof vi.fn>;
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
      isRecruiter: vi.fn().mockReturnValue(false),
      login: vi.fn().mockResolvedValue(undefined),
      register: vi.fn().mockResolvedValue(undefined),
      loginWithGoogle: vi.fn().mockResolvedValue(undefined),
      validateAudience: vi.fn().mockResolvedValue(true),
      logout: vi.fn().mockResolvedValue(undefined),
      setUser: vi.fn().mockResolvedValue(undefined),
      clearError: vi.fn(),
      tryHandleRedirectResult: vi.fn().mockResolvedValue(undefined),
    };

    navigate = vi.fn().mockResolvedValue(true);

    TestBed.configureTestingModule({
      providers: [
        AuthFacade,
        { provide: AuthStore, useValue: storeMock },
        { provide: AuthService, useValue: {} },
        { provide: AccountService, useValue: {} },
        {
          provide: ProfileFacade,
          useValue: {
            loadProfile: vi.fn().mockResolvedValue(undefined),
            isProfileComplete: vi.fn().mockReturnValue(true),
          },
        },
        { provide: Router, useValue: { navigate } },
        {
          provide: RecruiterFacade,
          useValue: {
            reset: vi.fn(),
            loadProfile: vi.fn().mockResolvedValue(undefined),
            isProfileComplete: vi.fn().mockReturnValue(false),
          },
        },
      ],
    });

    facade = TestBed.inject(AuthFacade);
  });

  it('login() navigates to candidate dashboard when sign-in succeeds', async () => {
    storeMock.user.mockReturnValue({
      uid: 'u1',
      email: 'a@b.com',
      displayName: null,
    });

    await facade.login('a@b.com', 'pwd', 'candidate');

    expect(storeMock.login).toHaveBeenCalledWith('a@b.com', 'pwd');
    expect(storeMock.validateAudience).toHaveBeenCalledWith('candidate');
    expect(navigate).toHaveBeenCalledWith(['/candidate/dashboard']);
  });

  it('register() navigates to recruiter profile for recruiter audience', async () => {
    storeMock.user.mockReturnValue({
      uid: 'u1',
      email: 'a@b.com',
      displayName: 'Rec',
    });

    await facade.register('Rec', 'a@b.com', 'pwd', 'recruiter');

    expect(navigate).toHaveBeenCalledWith(['/recruiter/profile']);
  });

  it('logout() always navigates to home', async () => {
    await facade.logout();

    expect(storeMock.logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/']);
  });

  it('tryHandleRedirectResult() does not navigate when session was not restored from redirect', async () => {
    storeMock.user.mockReturnValue({
      uid: 'u1',
      email: 'a@b.com',
      displayName: 'Rec',
    });
    storeMock.tryHandleRedirectResult.mockResolvedValue(false);

    await facade.tryHandleRedirectResult();

    expect(navigate).not.toHaveBeenCalled();
  });

  it('tryHandleRedirectResult() navigates after Google redirect sign-in', async () => {
    storeMock.user.mockReturnValue({
      uid: 'u1',
      email: 'a@b.com',
      displayName: 'Rec',
    });
    storeMock.isRecruiter.mockReturnValue(true);
    storeMock.tryHandleRedirectResult.mockResolvedValue(true);

    await facade.tryHandleRedirectResult();

    expect(navigate).toHaveBeenCalledWith(['/recruiter/profile']);
  });
});
