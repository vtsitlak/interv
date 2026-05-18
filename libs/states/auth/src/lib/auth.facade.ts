import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { RecruiterFacade } from '@interv/state-recruiter';
import { AuthStore } from './auth.store';
import type { ProfileUser } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly recruiterFacade = inject(RecruiterFacade);

  readonly user = this.store.user;
  readonly role = this.store.role;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  readonly isAuthenticated = this.store.isAuthenticated;
  readonly isRecruiter = this.store.isRecruiter;
  readonly isCandidate = this.store.isCandidate;

  async tryHandleRedirectResult(): Promise<void> {
    await this.store.tryHandleRedirectResult();
    if (this.store.user()) {
      await this.navigateAfterAuth();
    }
  }

  async login(email: string, password: string): Promise<void> {
    await this.store.login(email, password);
    if (this.store.user()) {
      await this.navigateAfterAuth();
    }
  }

  async loginAsRecruiter(email: string, password: string): Promise<void> {
    await this.store.login(email, password);
    if (!this.store.user()) {
      return;
    }
    if (!this.store.isRecruiter()) {
      await this.store.logout();
      this.store.setError(
        'This account is not a recruiter. Sign in with a recruiter account or register as a recruiter.',
      );
      return;
    }
    await this.navigateAfterAuth();
  }

  async register(name: string, email: string, password: string): Promise<void> {
    await this.store.register(name, email, password);
    if (this.store.user()) {
      await this.router.navigate(['/candidate/dashboard']);
    }
  }

  async registerRecruiter(
    name: string,
    email: string,
    password: string,
  ): Promise<void> {
    await this.store.registerRecruiter(name, email, password);
    if (this.store.user()) {
      await this.router.navigate(['/recruiter/profile']);
    }
  }

  async loginWithGoogle(): Promise<void> {
    await this.store.loginWithGoogle();
    if (this.store.user()) {
      await this.navigateAfterAuth();
    }
  }

  async loginWithGoogleAsRecruiter(): Promise<void> {
    await this.store.loginWithGoogle();
    if (!this.store.user()) {
      return;
    }
    if (!this.store.isRecruiter()) {
      await this.store.logout();
      this.store.setError(
        'This account is not a recruiter. Sign in with a recruiter account or register as a recruiter.',
      );
      return;
    }
    await this.navigateAfterAuth();
  }

  async logout(): Promise<void> {
    await this.store.logout();
    this.recruiterFacade.reset();
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
