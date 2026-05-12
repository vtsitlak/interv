import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthFacade } from '@interv/state-auth';
import { RegisterComponent } from './register';

describe('RegisterComponent', () => {
  let fixture: ComponentFixture<RegisterComponent>;
  let component: RegisterComponent;
  const register = vi.fn();

  beforeEach(async () => {
    register.mockReset();
    await TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            error: () => null,
            loading: () => false,
            register,
            loginWithGoogle: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RegisterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onRegister invokes facade.register with form values when valid', () => {
    component.registerModel.set({
      name: 'Ada',
      email: 'ada@example.com',
      password: 'secret123',
    });
    component.onRegister();

    expect(register).toHaveBeenCalledWith('Ada', 'ada@example.com', 'secret123');
  });

  it('onRegister does not call facade.register when invalid', () => {
    component.registerModel.set({ name: '', email: '', password: 'x' });
    component.onRegister();

    expect(register).not.toHaveBeenCalled();
  });
});
