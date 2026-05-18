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

interface RegisterFormModel {
  name: string;
  email: string;
  password: string;
}

@Component({
  selector: 'lib-recruiter-register',
  standalone: true,
  imports: [FormField, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './recruiter-register.html',
})
export class RecruiterRegisterComponent {
  readonly facade = inject(AuthFacade);

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

  onRegister(): void {
    if (this.registerForm().invalid()) {
      return;
    }
    const { name, email: emailValue, password } = this.registerModel();
    void this.facade.registerRecruiter(name, emailValue, password);
  }
}
