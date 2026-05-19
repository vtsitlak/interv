import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { AccountService } from '@interv/state-auth';
import { AuthFacade } from '@interv/state-auth';
import { from, switchMap, take } from 'rxjs';

export const recruiterGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const authFacade = inject(AuthFacade);
  const accountService = inject(AccountService);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    switchMap((user) => {
      if (!user) {
        return from(Promise.resolve(router.createUrlTree(['/recruiter/login'])));
      }
      return from(
        (async () => {
          await authFacade.setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          });
          const role = await accountService.getRoleOrDefault(user.uid);
          if (role !== 'recruiter') {
            return router.createUrlTree(['/candidate/dashboard']);
          }
          return true;
        })(),
      );
    }),
  );
};

export const candidateGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const authFacade = inject(AuthFacade);
  const accountService = inject(AccountService);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    switchMap((user) => {
      if (!user) {
        return from(Promise.resolve(router.createUrlTree(['/'])));
      }
      return from(
        (async () => {
          await authFacade.setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          });
          const role = await accountService.getRoleOrDefault(user.uid);
          if (role === 'recruiter') {
            return router.createUrlTree(['/recruiter/dashboard']);
          }
          return true;
        })(),
      );
    }),
  );
};
