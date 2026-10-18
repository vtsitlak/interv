import { TestBed } from '@angular/core/testing';
import {
  Router,
  type ActivatedRouteSnapshot,
  type RouterStateSnapshot,
  type UrlTree,
} from '@angular/router';
import { Auth, authState, type User } from '@angular/fire/auth';
import { firstValueFrom, of, type Observable } from 'rxjs';
import { authGuard } from './auth.guard';

jest.mock('@interv/state-auth', () => ({
  AuthFacade: class AuthFacade {},
}));

import { AuthFacade } from '@interv/state-auth';

describe('authGuard', () => {
  const FAKE_URL_TREE = {} as UrlTree;
  let createUrlTree: jest.Mock;
  let setUser: jest.Mock;

  beforeEach(() => {
    jest.mocked(authState).mockReset();
    jest.mocked(authState).mockReturnValue(of(null));
    createUrlTree = jest.fn().mockReturnValue(FAKE_URL_TREE);
    setUser = jest.fn().mockResolvedValue(undefined);
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
          {} as RouterStateSnapshot,
        ) as Observable<boolean | UrlTree>,
    );

  it('allows navigation when a user is signed in', async () => {
    jest.mocked(authState).mockReturnValue(
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

  it('redirects to home when no user is signed in', async () => {
    jest.mocked(authState).mockReturnValue(of(null));

    const result = await firstValueFrom(runGuard());

    expect(result).toBe(FAKE_URL_TREE);
    expect(createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
