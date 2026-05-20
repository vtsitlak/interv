import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getRedirectResult,
  GoogleAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updatePassword,
  updateProfile,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { userHasPasswordProvider } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);

  loginWithEmail(email: string, password: string): Promise<UserCredential> {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  registerWithEmail(email: string, password: string): Promise<UserCredential> {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  updateDisplayName(user: User, displayName: string): Promise<void> {
    return updateProfile(user, { displayName });
  }

  loginWithGooglePopup(): Promise<UserCredential> {
    return signInWithPopup(
      this.auth,
      this.googleProvider(),
      browserPopupRedirectResolver,
    );
  }

  loginWithGoogleRedirect(): Promise<void> {
    return signInWithRedirect(
      this.auth,
      this.googleProvider(),
      browserPopupRedirectResolver,
    );
  }

  getRedirectResult(): Promise<UserCredential | null> {
    return getRedirectResult(this.auth);
  }

  logout(): Promise<void> {
    return signOut(this.auth);
  }

  hasPasswordProvider(): boolean {
    return userHasPasswordProvider(this.auth.currentUser);
  }

  async changePassword(
    email: string,
    newPassword: string,
    currentPassword?: string,
  ): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      throw Object.assign(new Error('You must be signed in to change your password.'), {
        code: 'auth/user-not-found',
      });
    }

    if (userHasPasswordProvider(user)) {
      if (!currentPassword?.trim()) {
        throw Object.assign(new Error('Current password is required.'), {
          code: 'auth/missing-password',
        });
      }
      const credential = EmailAuthProvider.credential(email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      await user.reload();
      return;
    }

    const credential = EmailAuthProvider.credential(email, newPassword);
    await linkWithCredential(user, credential);
    await user.reload();
  }

  private googleProvider(): GoogleAuthProvider {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return provider;
  }
}
