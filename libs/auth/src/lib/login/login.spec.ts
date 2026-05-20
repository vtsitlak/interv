import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthFacade } from '@interv/state-auth';
import { LoginComponent } from './login';

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  const login = vi.fn();
  const loginWithGoogle = vi.fn();

  beforeEach(async () => {
    login.mockReset();
    loginWithGoogle.mockReset();
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
            loginWithGoogle,
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

  it('onLogin invokes facade.login with candidate audience by default', () => {
    component.loginModel.set({ email: 'a@b.com', password: 'secret123' });
    component.onLogin(new Event('submit'));

    expect(login).toHaveBeenCalledWith('a@b.com', 'secret123', 'candidate');
  });

  it('onLogin calls preventDefault when a submit event is passed', () => {
    const event = new Event('submit');
    const preventDefault = vi.spyOn(event, 'preventDefault');
    component.onLogin(event);
    expect(preventDefault).toHaveBeenCalled();
  });

  it('onLogin passes recruiter audience when input is set', () => {
    fixture.componentRef.setInput('audience', 'recruiter');
    fixture.detectChanges();
    component.loginModel.set({ email: 'a@b.com', password: 'secret123' });
    component.onLogin(new Event('submit'));

    expect(login).toHaveBeenCalledWith('a@b.com', 'secret123', 'recruiter');
  });

  it('onGoogleSignIn invokes facade.loginWithGoogle in login mode', () => {
    component.onGoogleSignIn();
    expect(loginWithGoogle).toHaveBeenCalledWith('candidate', 'login');
  });
});
