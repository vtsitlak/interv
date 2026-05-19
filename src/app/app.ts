import { Component, inject, signal } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { RouterOutlet } from '@angular/router';
import { ConfirmModalComponent, HeaderComponent } from '@interv/shared';
import { AuthFacade } from '@interv/state-auth';
import { take } from 'rxjs';

type AccountConfirmAction = 'reset' | 'delete';

@Component({
  imports: [RouterOutlet, HeaderComponent, ConfirmModalComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = 'Interv';
  protected readonly authFacade = inject(AuthFacade);
  private readonly auth = inject(Auth);

  readonly accountConfirmAction = signal<AccountConfirmAction | null>(null);
  readonly isAccountActionLoading = signal(false);
  readonly accountActionError = signal<string | null>(null);

  readonly resetConfirmMessage =
    'This removes all profile fields, interviews, and AI training data from your account. Your login is kept so you can train a new profile.';
  readonly deleteConfirmMessage =
    'This permanently deletes your account, profile data, and interviews. This cannot be undone.';

  constructor() {
    void this.authFacade.tryHandleRedirectResult();
    authState(this.auth)
      .pipe(take(1))
      .subscribe((user) => {
        if (!user) {
          return;
        }
        void this.authFacade.setUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
        });
      });
  }

  protected async onLogout(): Promise<void> {
    await this.authFacade.logout();
  }

  protected openResetProfileConfirm(): void {
    this.accountActionError.set(null);
    this.accountConfirmAction.set('reset');
  }

  protected openDeleteAccountConfirm(): void {
    this.accountActionError.set(null);
    this.accountConfirmAction.set('delete');
  }

  protected cancelAccountConfirm(): void {
    if (this.isAccountActionLoading()) {
      return;
    }
    this.accountConfirmAction.set(null);
  }

  protected async confirmAccountAction(): Promise<void> {
    const action = this.accountConfirmAction();
    if (!action || this.isAccountActionLoading()) {
      return;
    }

    this.isAccountActionLoading.set(true);
    this.accountActionError.set(null);
    try {
      if (action === 'reset') {
        await this.authFacade.resetCandidateProfile();
      } else {
        await this.authFacade.deleteAccount();
      }
      this.accountConfirmAction.set(null);
    } catch (e: unknown) {
      this.accountActionError.set(
        e instanceof Error ? e.message : 'Something went wrong.',
      );
    } finally {
      this.isAccountActionLoading.set(false);
    }
  }

  protected accountConfirmTitle(): string {
    return this.accountConfirmAction() === 'reset'
      ? 'Reset profile?'
      : 'Delete account?';
  }

  protected accountConfirmMessage(): string {
    return this.accountConfirmAction() === 'reset'
      ? this.resetConfirmMessage
      : this.deleteConfirmMessage;
  }

  protected accountConfirmLabel(): string {
    return this.accountConfirmAction() === 'reset' ? 'Reset profile' : 'Delete account';
  }
}
