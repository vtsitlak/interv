import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  email,
  form,
  FormField,
  minLength,
  required,
} from '@angular/forms/signals';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  AUTH_AUDIENCE_COPY,
  AuthFacade,
  type AuthAudience,
} from '@interv/state-auth';
import { SI_GOOGLE_PATH, LogoComponent } from '@interv/shared';

interface LoginFormModel {
  email: string;
  password: string;
}

@Component({
  selector: 'interv-login',
  standalone: true,
  imports: [FormField, RouterLink, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  readonly facade = inject(AuthFacade);
  private readonly route = inject(ActivatedRoute);

  /** Candidate or recruiter auth UI and behavior. */
  readonly audience = input<AuthAudience>('candidate');

  readonly googleBrandPath = SI_GOOGLE_PATH;

  readonly copy = computed(
    () => AUTH_AUDIENCE_COPY[this.resolvedAudience()],
  );

  readonly resolvedAudience = computed<AuthAudience>(() => {
    const fromRoute = this.route.snapshot.data['authAudience'] as
      | AuthAudience
      | undefined;
    return fromRoute ?? this.audience();
  });

  readonly loginModel = signal<LoginFormModel>({
    email: '',
    password: '',
  });

  readonly loginForm = form(this.loginModel, (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Please enter a valid email address' });
    required(path.password, { message: 'Password is required' });
    minLength(path.password, 6, {
      message: 'Password must be at least 6 characters',
    });
  });

  onLogin(): void {
    if (this.loginForm().invalid()) {
      return;
    }
    const { email: emailValue, password } = this.loginModel();
    void this.facade.login(emailValue, password, this.resolvedAudience());
  }

  onGoogleSignIn(): void {
    void this.facade.loginWithGoogle(this.resolvedAudience(), 'login');
  }
}
