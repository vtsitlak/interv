import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthFacade, AuthSyncService } from '@interv/state-auth';
import { ProfileFacade } from '@interv/state-profile';
import { App } from './app';

jest.mock('@interv/state-auth', () => ({
  AuthFacade: class {},
  AuthSyncService: class {},
}));

jest.mock('@interv/state-profile', () => ({
  ProfileFacade: class {},
}));

describe('App', () => {
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: AuthSyncService,
          useValue: {},
        },
        {
          provide: AuthFacade,
          useValue: {
            isAuthenticated: () => false,
            isRecruiter: () => false,
            isCandidate: () => false,
            tryHandleRedirectResult: jest.fn().mockResolvedValue(undefined),
            setUser: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ProfileFacade,
          useValue: {
            isComplete: () => false,
            loadProfile: jest.fn().mockResolvedValue(undefined),
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
