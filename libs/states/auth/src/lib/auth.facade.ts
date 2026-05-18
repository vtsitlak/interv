import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from './auth.store';
import type { ProfileUser } from './auth.models';

@Injectable({ providedIn: 'root' })
export class AuthFacade {
  private readonly store = inject(AuthStore);
  private readonly router = inject(Router);

  readonly user = this.store.user;
  readonly loading = this.store.loading;
  readonly error = this.store.error;
  readonly isAuthenticated = this.store.isAuthenticated;

  async tryHandleRedirectResult(): Promise<void> {
    await this.store.tryHandleRedirectResult();
    if (this.store.user()) {
      await this.router.navigate(['/candidate/dashboard']);
    }
  }

  async login(email: string, password: string): Promise<void> {
    await this.store.login(email, password);
    if (this.store.user()) {
      await this.router.navigate(['/candidate/dashboard']);
    }
  }

  async register(name: string, email: string, password: string): Promise<void> {
    await this.store.register(name, email, password);
    if (this.store.user()) {
      await this.router.navigate(['/candidate/dashboard']);
    }
  }

  async loginWithGoogle(): Promise<void> {
    await this.store.loginWithGoogle();
    if (this.store.user()) {
      await this.router.navigate(['/candidate/dashboard']);
    }
  }

  async logout(): Promise<void> {
    await this.store.logout();
    await this.router.navigate(['/login']);
  }

  setUser(user: ProfileUser | null): void {
    this.store.setUser(user);
  }

  clearError(): void {
    this.store.clearError();
  }
}
