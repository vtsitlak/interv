import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthFacade } from '@interv/state-auth';
import { LoginComponent } from './login';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  const login = vi.fn();

  beforeEach(async () => {
    login.mockReset();
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            error: () => null,
            loading: () => false,
            login,
            loginWithGoogle: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onLogin invokes facade.login with form values when valid', () => {
    component.loginModel.set({ email: 'a@b.com', password: 'secret123' });
    component.onLogin();

    expect(login).toHaveBeenCalledWith('a@b.com', 'secret123');
  });

  it('onLogin does not call facade.login when invalid', () => {
    component.loginModel.set({ email: '', password: 'x' });
    component.onLogin();

    expect(login).not.toHaveBeenCalled();
  });
});
