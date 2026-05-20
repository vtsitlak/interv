import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthFacade } from '@interv/state-auth';
import { AccountComponent } from './account';

describe('AccountComponent', () => {
  let fixture: ComponentFixture<AccountComponent>;
  let component: AccountComponent;
  const changePassword = vi.fn().mockResolvedValue(true);
  const hasPasswordProvider = vi.fn().mockReturnValue(false);

  beforeEach(async () => {
    changePassword.mockClear();
    hasPasswordProvider.mockReturnValue(false);

    await TestBed.configureTestingModule({
      imports: [AccountComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthFacade,
          useValue: {
            user: () => ({ uid: 'u1', email: 'user@test.com', displayName: 'U' }),
            isRecruiter: () => false,
            loading: () => false,
            error: () => null,
            clearError: vi.fn(),
            hasPasswordProvider,
            changePassword,
            resetCandidateProfile: vi.fn(),
            deleteAccount: vi.fn(),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('onChangePassword calls preventDefault and facade.changePassword', async () => {
    component.passwordModel.set({
      currentPassword: '',
      newPassword: 'secret123',
    });
    const event = new Event('submit');
    const preventDefault = vi.spyOn(event, 'preventDefault');

    await component.onChangePassword(event);

    expect(preventDefault).toHaveBeenCalled();
    expect(changePassword).toHaveBeenCalledWith(null, 'secret123');
  });

  it('shows reset profile section for candidates', () => {
    expect(fixture.nativeElement.textContent).toContain('Reset profile');
  });
});
