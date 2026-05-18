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
import { SI_GOOGLE_PATH } from '@interv/ui';

interface LoginFormModel {
  email: string;
  password: string;
}

@Component({
  selector: 'lib-recruiter-login',
  standalone: true,
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recruiter-login.html',
})
export class RecruiterLoginComponent {
  readonly facade = inject(AuthFacade);
  readonly googleBrandPath = SI_GOOGLE_PATH;

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
    void this.facade.loginAsRecruiter(emailValue, password);
  }
}
