import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Auth } from '@angular/fire/auth';
import { provideRouter } from '@angular/router';
import { AuthFacade, AuthSyncService } from '@interv/state-auth';
import { ProfileFacade } from '@interv/state-profile';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';

vi.mock('@angular/fire/auth', () => ({
  authState: () => of(null),
}));

describe('App', () => {
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: {} },
        { provide: AuthSyncService, useValue: {} },
        {
          provide: AuthFacade,
          useValue: {
            isAuthenticated: () => false,
            isRecruiter: () => false,
            isCandidate: () => false,
            tryHandleRedirectResult: vi.fn().mockResolvedValue(undefined),
            setUser: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ProfileFacade,
          useValue: {
            isComplete: () => false,
            loadProfile: vi.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the app header', () => {
    expect(fixture.nativeElement.querySelector('interv-header')).toBeTruthy();
  });
});
