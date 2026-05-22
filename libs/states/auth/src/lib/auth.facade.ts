import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { ProfileFacade } from '@interv/state-profile';
import { RecruiterFacade } from '@interv/state-recruiter';
import type { AuthAudience } from './auth-audience';
import { AccountService } from './account.service';
import { AuthService } from './auth.service';
import { AuthStore } from './auth.store';
import type { ProfileUser } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly store = inject(AuthStore);
  private readonly authService = inject(AuthService);
  private readonly accountService = inject(AccountService);
  private readonly router = inject(Router);
  private readonly recruiterFacade = inject(RecruiterFacade);
  private readonly profileFacade = inject(ProfileFacade);

  readonly user = this.store.user;
  readonly role = this.store.role;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  readonly isAuthenticated = this.store.isAuthenticated;
  readonly isRecruiter = this.store.isRecruiter;
  readonly isCandidate = this.store.isCandidate;

  async tryHandleRedirectResult(): Promise<void> {
    const signedInViaRedirect = await this.store.tryHandleRedirectResult();
    if (signedInViaRedirect && this.store.user()) {
      await this.navigateAfterAuth();
    }
  }

  async login(
    email: string,
    password: string,
    audience: AuthAudience = 'candidate',
  ): Promise<void> {
    await this.store.login(email, password);
    if (!this.store.user()) {
      return;
    }
    const ok = await this.store.validateAudience(audience);
    if (ok) {
      await this.navigateAfterAuth();
    }
  }

  async register(
    name: string,
    email: string,
    password: string,
    audience: AuthAudience = 'candidate',
  ): Promise<void> {
    await this.store.register(name, email, password, audience);
    if (!this.store.user()) {
      return;
    }
    if (audience === 'recruiter') {
      await this.router.navigate(['/recruiter/profile']);
      return;
    }
    await this.router.navigate(['/candidate/dashboard']);
  }

  async loginWithGoogle(
    audience: AuthAudience = 'candidate',
    mode: 'login' | 'register' = 'login',
  ): Promise<void> {
    await this.store.loginWithGoogle(audience, mode);
    if (this.store.user()) {
      await this.navigateAfterAuth();
    }
  }

  async logout(): Promise<void> {
    await this.store.logout();
    this.recruiterFacade.reset();
    await this.router.navigate(['/']);
  }

  hasPasswordProvider(): boolean {
    return this.authService.hasPasswordProvider();
  }

  async changePassword(
    currentPassword: string | null,
    newPassword: string,
  ): Promise<boolean> {
    const email = this.store.user()?.email;
    if (!email) {
      this.store.setError('Add an email to your account before setting a password.');
      return false;
    }
    await this.store.changePassword(
      email,
      newPassword,
      currentPassword?.trim() || undefined,
    );
    return !this.store.error();
  }

  async resetCandidateProfile(): Promise<void> {
    await this.accountService.resetCandidateProfile();
    await this.profileFacade.loadProfile();
  }

  async deleteAccount(): Promise<void> {
    await this.accountService.deleteAccount();
    this.recruiterFacade.reset();
    await this.authService.logout();
    await this.store.clearSession();
    await this.router.navigate(['/']);
  }

  async setUser(user: ProfileUser | null): Promise<void> {
    await this.store.setUser(user);
  }

  clearError(): void {
    this.store.clearError();
  }

  private async navigateAfterAuth(): Promise<void> {
    if (this.store.isRecruiter()) {
      await this.recruiterFacade.loadProfile();
      if (this.recruiterFacade.isProfileComplete()) {
        await this.router.navigate(['/recruiter/dashboard']);
      } else {
        await this.router.navigate(['/recruiter/profile']);
      }
      return;
    }
    await this.router.navigate(['/candidate/dashboard']);
  }
}
