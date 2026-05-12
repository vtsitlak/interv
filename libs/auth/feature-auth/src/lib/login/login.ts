import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import {
  email,
  form,
  FormField,
  minLength,
  required,
} from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { AuthFacade } from '@interv/state-auth';

interface LoginFormModel {
  email: string;
  password: string;
}

@Component({
  selector: 'lib-login',
  standalone: true,
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  readonly facade = inject(AuthFacade);

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
    if (this.loginForm().invalid()) return;
    const { email: emailValue, password } = this.loginModel();
    void this.facade.login(emailValue, password);
  }
}
