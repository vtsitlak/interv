import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthFacade } from '@interv/state-auth';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const authFacade = inject(AuthFacade);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map((user) => {
      if (user) {
        authFacade.setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
        return true;
      }
      return router.createUrlTree(['/login']);
    }),
  );
};
