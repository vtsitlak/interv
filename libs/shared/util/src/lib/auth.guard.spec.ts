import { TestBed } from '@angular/core/testing';
import {
  Router,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { AuthFacade } from '@interv/state-auth';
import { Auth, type User } from '@angular/fire/auth';
import { firstValueFrom, of, type Observable } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@angular/fire/auth', async () => {
  const actual =
    await vi.importActual<typeof import('@angular/fire/auth')>(
      '@angular/fire/auth'
    );
  return {
    ...actual,
    authState: vi.fn(),
  };
});

import { authState } from '@angular/fire/auth';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const FAKE_URL_TREE = {} as UrlTree;
  let createUrlTree: ReturnType<typeof vi.fn>;

  let setUser: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createUrlTree = vi.fn().mockReturnValue(FAKE_URL_TREE);
    setUser = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: {} },
        { provide: Router, useValue: { createUrlTree } },
        { provide: AuthFacade, useValue: { setUser } },
      ],
    });
  });

  const runGuard = () =>
    TestBed.runInInjectionContext(
      () =>
        authGuard(
          {} as ActivatedRouteSnapshot,
          {} as RouterStateSnapshot
        ) as Observable<boolean | UrlTree>
    );

  it('allows navigation when a user is signed in', async () => {
    vi.mocked(authState).mockReturnValue(
      of({ uid: 'u1', email: 'e@x.com', displayName: 'E' } as User),
    );

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(true);
    expect(createUrlTree).not.toHaveBeenCalled();
    expect(setUser).toHaveBeenCalledWith({
      uid: 'u1',
      email: 'e@x.com',
      displayName: 'E',
    });
  });

  it('redirects to /login when no user is signed in', async () => {
    vi.mocked(authState).mockReturnValue(of(null));

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(FAKE_URL_TREE);
    expect(createUrlTree).toHaveBeenCalledWith(['/login']);
  });
});
