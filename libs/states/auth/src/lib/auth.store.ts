import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { AuthAudience, AuthFlowMode } from './auth-audience';
import { AUTH_AUDIENCE_COPY } from './auth-audience';
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
import { consumePendingAuth, setPendingAuth } from './pending-auth';

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
      const role = await accountService.getRoleOrDefault(uid);
      patchState(store, { role });
    };

    const applyRoleForAudience = async (
      uid: string,
      audience: AuthAudience,
    ): Promise<boolean> => {
      const role = await accountService.getRoleOrDefault(uid);
      if (role !== audience) {
        await authService.logout();
        patchState(store, {
          user: null,
          role: null,
          loading: false,
          error: AUTH_AUDIENCE_COPY[audience].wrongAccountMessage,
        });
        return false;
      }
      patchState(store, { role });
      return true;
    };

    const finalizeGoogleSignIn = async (
      user: ProfileUser,
    ): Promise<boolean> => {
      const pending = consumePendingAuth();
      const hasRole = await accountService.hasRole(user.uid);
      let role = await accountService.getRole(user.uid);

      if (pending?.mode === 'register' && !hasRole) {
        await accountService.setRole(user.uid, pending.audience);
        role = pending.audience;
      } else if (!hasRole) {
        const defaultRole = pending?.audience ?? 'candidate';
        await accountService.setRole(user.uid, defaultRole);
        role = defaultRole;
      } else if (role === null) {
        role = await accountService.getRoleOrDefault(user.uid);
      }

      if (pending?.mode === 'login' && role !== pending.audience) {
        await authService.logout();
        patchState(store, {
          user: null,
          role: null,
          loading: false,
          error: AUTH_AUDIENCE_COPY[pending.audience].wrongAccountMessage,
        });
        return false;
      }

      patchState(store, { user, role, loading: false, error: null });
      return true;
    };

    return {
      async tryHandleRedirectResult(): Promise<void> {
        try {
          const cred = await authService.getRedirectResult();
          const user = toProfileUser(cred?.user ?? null);
          if (!user) {
            return;
          }
          patchState(store, { loading: true, error: null });
          await finalizeGoogleSignIn(user);
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
        audience: AuthAudience,
      ): Promise<void> {
        patchState(store, { loading: true, error: null });
        try {
          const cred = await authService.registerWithEmail(email, password);
          await authService.updateDisplayName(cred.user, name);
          await accountService.setRole(cred.user.uid, audience);
          patchState(store, {
            user: {
              uid: cred.user.uid,
              email: cred.user.email,
              displayName: name,
            },
            role: audience,
            loading: false,
          });
        } catch (e: unknown) {
          patchState(store, {
            error: firebaseErrorMessage(e),
            loading: false,
          });
        }
      },

      async loginWithGoogle(
        audience: AuthAudience,
        mode: AuthFlowMode,
      ): Promise<void> {
        setPendingAuth({ audience, mode });
        patchState(store, { loading: true, error: null });
        try {
          const cred = await authService.loginWithGooglePopup();
          const user = toProfileUser(cred.user);
          if (!user) {
            patchState(store, { loading: false });
            return;
          }
          await finalizeGoogleSignIn(user);
        } catch (e: unknown) {
          const code = firebaseAuthErrorCode(e);
          if (code && GOOGLE_POPUP_FALLBACK_CODES.has(code)) {
            try {
              await authService.loginWithGoogleRedirect();
              return;
            } catch (e2: unknown) {
              consumePendingAuth();
              patchState(store, {
                error: firebaseErrorMessage(e2),
                loading: false,
              });
            }
            return;
          }
          consumePendingAuth();
          patchState(store, {
            error: firebaseErrorMessage(e),
            loading: false,
          });
        }
      },

      async validateAudience(audience: AuthAudience): Promise<boolean> {
        const uid = store.user()?.uid;
        if (!uid) {
          return false;
        }
        return applyRoleForAudience(uid, audience);
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

      clearError(): void {
        patchState(store, { error: null });
      },

      setError(message: string): void {
        patchState(store, { error: message, loading: false });
      },
    };
  }),
);
