import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import { AccountService } from './account.service';
import { AuthService } from './auth.service';
import {
  authInitialState,
  firebaseAuthErrorCode,
  firebaseErrorMessage,
  GOOGLE_POPUP_FALLBACK_CODES,
  toProfileUser,
  type AuthState,
  type ProfileUser,
} from './auth.models';

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState<AuthState>(authInitialState),
  withComputed(({ user, role }) => ({
    isAuthenticated: computed(() => !!user()),
    isRecruiter: computed(() => role() === 'recruiter'),
    isCandidate: computed(() => role() === 'candidate' || role() === null),
  })),
  withMethods((store) => {
    const authService = inject(AuthService);
    const accountService = inject(AccountService);

    const syncRole = async (uid: string): Promise<void> => {
      const role = await accountService.getRole(uid);
      patchState(store, { role });
    };

    return {
      async tryHandleRedirectResult(): Promise<void> {
        try {
          const cred = await authService.getRedirectResult();
          const user = toProfileUser(cred?.user ?? null);
          if (!user) return;
          await syncRole(user.uid);
          patchState(store, { user, loading: false, error: null });
        } catch (e: unknown) {
          patchState(store, {
            error: firebaseErrorMessage(e),
            loading: false,
          });
        }
      },

      async login(email: string, password: string): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const cred = await authService.loginWithEmail(email, password);
          const user = toProfileUser(cred.user);
          if (user) {
            await syncRole(user.uid);
          }
          patchState(store, {
            user,
            loading: false,
          });
        } catch (e: unknown) {
          patchState(store, {
            error: firebaseErrorMessage(e),
            loading: false,
          });
        }
      },

      async register(
        name: string,
        email: string,
        password: string,
      ): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const cred = await authService.registerWithEmail(email, password);
          await authService.updateDisplayName(cred.user, name);
          await accountService.setRole(cred.user.uid, 'candidate');
          patchState(store, {
            user: {
              uid: cred.user.uid,
              email: cred.user.email,
              displayName: name,
            },
            role: 'candidate',
            loading: false,
          });
        } catch (e: unknown) {
          patchState(store, {
            error: firebaseErrorMessage(e),
            loading: false,
          });
        }
      },

      async registerRecruiter(
        name: string,
        email: string,
        password: string,
      ): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const cred = await authService.registerWithEmail(email, password);
          await authService.updateDisplayName(cred.user, name);
          await accountService.setRole(cred.user.uid, 'recruiter');
          patchState(store, {
            user: {
              uid: cred.user.uid,
              email: cred.user.email,
              displayName: name,
            },
            role: 'recruiter',
            loading: false,
          });
        } catch (e: unknown) {
          patchState(store, {
            error: firebaseErrorMessage(e),
            loading: false,
          });
        }
      },

      async loginWithGoogle(): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const cred = await authService.loginWithGooglePopup();
          const user = toProfileUser(cred.user);
          if (user) {
            await syncRole(user.uid);
          }
          patchState(store, {
            user,
            loading: false,
          });
        } catch (e: unknown) {
          const code = firebaseAuthErrorCode(e);
          if (code && GOOGLE_POPUP_FALLBACK_CODES.has(code)) {
            try {
              await authService.loginWithGoogleRedirect();
              return;
            } catch (e2: unknown) {
              patchState(store, {
                error: firebaseErrorMessage(e2),
                loading: false,
              });
            }
            return;
          }
          patchState(store, {
            error: firebaseErrorMessage(e),
            loading: false,
          });
        }
      },

      async logout(): Promise<void> {
        await authService.logout();
        patchState(store, { user: null, role: null });
      },

      async setUser(user: ProfileUser | null): Promise<void> {
        if (!user) {
          patchState(store, { user: null, role: null });
          return;
        }
        await syncRole(user.uid);
        patchState(store, { user });
      },

      async refreshRole(): Promise<void> {
        const uid = store.user()?.uid;
        if (!uid) {
          patchState(store, { role: null });
          return;
        }
        await syncRole(uid);
      },

      clearError(): void {
        patchState(store, { error: null });
      },

      setError(message: string): void {
        patchState(store, { error: message, loading: false });
      },
    };
  }),
);
