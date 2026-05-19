import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthFacade } from '@interv/state-auth';
import { Auth, authState } from '@angular/fire/auth';
import { from, switchMap, take } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const authFacade = inject(AuthFacade);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    switchMap((user) => {
      if (!user) {
        return from(Promise.resolve(router.createUrlTree(['/'])));
      }
      return from(
        authFacade.setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        }).then(() => true as const),
      );
    }),
  );
};
