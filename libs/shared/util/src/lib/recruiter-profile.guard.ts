import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { RecruiterFacade } from '@interv/state-recruiter';
import { from, map } from 'rxjs';

export const recruiterProfileCompleteGuard: CanActivateFn = () => {
  const recruiterFacade = inject(RecruiterFacade);
  const router = inject(Router);

  return from(recruiterFacade.loadProfile()).pipe(
    map(() =>
      recruiterFacade.isProfileComplete()
        ? true
        : router.createUrlTree(['/recruiter/profile']),
    ),
  );
};
