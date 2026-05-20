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

interface RegisterFormModel {
  name: string;
  email: string;
  password: string;
}

@Component({
  selector: 'interv-register',
  standalone: true,
  imports: [FormField, RouterLink, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent {
  readonly facade = inject(AuthFacade);
  private readonly route = inject(ActivatedRoute);

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

  readonly registerModel = signal<RegisterFormModel>({
    name: '',
    email: '',
    password: '',
  });

  readonly registerForm = form(this.registerModel, (path) => {
    required(path.name, { message: 'Full name is required' });
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Please enter a valid email address' });
    required(path.password, { message: 'Password is required' });
    minLength(path.password, 6, {
      message: 'Password must be at least 6 characters',
    });
  });

  onRegister(event: Event): void {
    event.preventDefault();
    if (this.registerForm().invalid()) {
      return;
    }
    const { name, email: emailValue, password } = this.registerModel();
    void this.facade.register(name, emailValue, password, this.resolvedAudience());
  }

  onGoogleSignUp(): void {
    void this.facade.loginWithGoogle(this.resolvedAudience(), 'register');
  }
}
