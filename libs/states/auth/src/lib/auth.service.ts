import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  browserPopupRedirectResolver,
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  updateProfile,
  type User,
  type UserCredential,
} from 'firebase/auth';

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

  private googleProvider(): GoogleAuthProvider {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    return provider;
  }
}
