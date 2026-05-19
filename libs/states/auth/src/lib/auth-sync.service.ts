import { inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth, authState } from '@angular/fire/auth';
import { toProfileUser } from './auth.models';
import { AuthStore } from './auth.store';

/**
 * Keeps {@link AuthStore} in sync with Firebase Auth on every sign-in/out.
 * Inject once at app startup so public routes (e.g. home) see auth state in the header.
 */
@Injectable({ providedIn: 'root' })
export class AuthSyncService {
  private readonly auth = inject(Auth);
  private readonly store = inject(AuthStore);

  constructor() {
    authState(this.auth)
      .pipe(takeUntilDestroyed())
      .subscribe((firebaseUser) => {
        void this.store.setUser(toProfileUser(firebaseUser));
      });
  }
}
