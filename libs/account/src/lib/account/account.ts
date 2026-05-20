import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  form,
  FormField,
  minLength,
  required,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { ConfirmModalComponent } from '@interv/shared';
import { AuthFacade } from '@interv/state-auth';

type AccountConfirmAction = 'reset' | 'delete';

interface PasswordFormModel {
  currentPassword: string;
  newPassword: string;
}

@Component({
  selector: 'interv-account',
  standalone: true,
  imports: [FormField, RouterLink, ConfirmModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account.html',
  styleUrl: './account.scss',
})
export class AccountComponent implements OnInit {
  readonly facade = inject(AuthFacade);

  readonly hasPasswordProvider = signal(false);
  readonly passwordSuccess = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);
  readonly isPasswordSubmitting = signal(false);
  readonly accountConfirmAction = signal<AccountConfirmAction | null>(null);
  readonly isAccountActionLoading = signal(false);
  readonly accountActionError = signal<string | null>(null);

  readonly isRecruiter = computed(() => this.facade.isRecruiter());
  readonly accountEmail = computed(() => this.facade.user()?.email ?? '');

  readonly passwordModel = signal<PasswordFormModel>({
    currentPassword: '',
    newPassword: '',
  });

  readonly passwordForm = form(this.passwordModel, (path) => {
    required(path.newPassword, { message: 'New password is required' });
    minLength(path.newPassword, 6, {
      message: 'Password must be at least 6 characters',
    });
  });

  readonly resetConfirmMessage =
    'This removes all profile fields, interviews, and AI training data from your account. Your login is kept so you can train a new profile.';
  readonly deleteConfirmMessage =
    'This permanently deletes your account, profile, interviews, and all related data. This cannot be undone.';

  ngOnInit(): void {
    this.facade.clearError();
    this.hasPasswordProvider.set(this.facade.hasPasswordProvider());
  }

  async onChangePassword(event: Event): Promise<void> {
    event.preventDefault();
    this.accountConfirmAction.set(null);
    this.passwordSuccess.set(null);
    this.passwordError.set(null);
    this.facade.clearError();

    if (this.passwordForm().invalid()) {
      return;
    }

    const { currentPassword, newPassword } = this.passwordModel();
    if (this.hasPasswordProvider() && !currentPassword.trim()) {
      this.passwordError.set('Enter your current password.');
      return;
    }

    const wasAddingPassword = !this.hasPasswordProvider();
    this.isPasswordSubmitting.set(true);
    try {
      const ok = await this.facade.changePassword(
        currentPassword.trim() || null,
        newPassword,
      );

      if (ok) {
        this.hasPasswordProvider.set(this.facade.hasPasswordProvider());
        this.passwordModel.set({ currentPassword: '', newPassword: '' });
        this.passwordSuccess.set(
          wasAddingPassword
            ? 'Password added. You can now sign in with email and password or Google.'
            : 'Password updated. You can sign in with email and password or Google.',
        );
        return;
      }

      this.passwordError.set(this.facade.error());
    } finally {
      this.isPasswordSubmitting.set(false);
    }
  }

  openResetProfileConfirm(): void {
    this.accountActionError.set(null);
    this.accountConfirmAction.set('reset');
  }

  openDeleteAccountConfirm(): void {
    this.accountActionError.set(null);
    this.accountConfirmAction.set('delete');
  }

  cancelAccountConfirm(): void {
    if (this.isAccountActionLoading()) {
      return;
    }
    this.accountConfirmAction.set(null);
  }

  async confirmAccountAction(): Promise<void> {
    const action = this.accountConfirmAction();
    if (!action || this.isAccountActionLoading()) {
      return;
    }

    this.isAccountActionLoading.set(true);
    this.accountActionError.set(null);
    try {
      if (action === 'reset') {
        await this.facade.resetCandidateProfile();
      } else {
        await this.facade.deleteAccount();
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

  accountConfirmTitle(): string {
    return this.accountConfirmAction() === 'reset'
      ? 'Reset profile?'
      : 'Delete account?';
  }

  accountConfirmMessage(): string {
    return this.accountConfirmAction() === 'reset'
      ? this.resetConfirmMessage
      : this.deleteConfirmMessage;
  }

  accountConfirmLabel(): string {
    return this.accountConfirmAction() === 'reset'
      ? 'Reset profile'
      : 'Delete account';
  }
}
