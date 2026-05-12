import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
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
  withComputed(({ user }) => ({
    isAuthenticated: computed(() => !!user()),
  })),
  withMethods((store) => {
    const authService = inject(AuthService);

    return {
      async tryHandleRedirectResult(): Promise<void> {
        try {
          const cred = await authService.getRedirectResult();
          const user = toProfileUser(cred?.user ?? null);
          if (!user) return;
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
          patchState(store, {
            user: toProfileUser(cred.user),
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
          patchState(store, {
            user: {
              uid: cred.user.uid,
              email: cred.user.email,
              displayName: name,
            },
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
          patchState(store, {
            user: toProfileUser(cred.user),
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
        patchState(store, { user: null });
      },

      setUser(user: ProfileUser | null): void {
        patchState(store, { user });
      },

      clearError(): void {
        patchState(store, { error: null });
      },
    };
  }),
);
