import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthFacade } from '@interv/state-auth';
import { DashboardFacade } from '@interv/state-dashboard';
import { ProfileFacade } from '@interv/state-profile';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DashboardComponent } from './dashboard';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  const loadInterviews = vi.fn().mockResolvedValue(undefined);
  const loadProfile = vi.fn().mockResolvedValue(undefined);

  beforeEach(async () => {
    loadInterviews.mockClear();
    loadProfile.mockClear();

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        {
          provide: DashboardFacade,
          useValue: {
            loadInterviews,
            selectInterview: vi.fn(),
            closeDetail: vi.fn(),
            interviews: () => [],
            selectedInterview: () => null,
            transcript: () => [],
            isLoading: () => false,
            isLoadingTranscript: () => false,
            error: () => null,
            totalInterviews: () => 0,
            completedInterviews: () => 0,
            averageScore: () => null,
          },
        },
        {
          provide: ProfileFacade,
          useValue: {
            loadProfile,
            profile: () => null,
            isComplete: () => false,
            isDiscoverableByRecruiters: () => true,
            isUpdatingVisibility: () => false,
            setProfileDiscoverability: vi.fn().mockResolvedValue(undefined),
            successMessage: () => null,
            shareUrl: () => '/candidate/u1',
          },
        },
        {
          provide: AuthFacade,
          useValue: {
            user: () => ({ uid: 'u1', email: null, displayName: null }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit loads interviews and profile', () => {
    component.ngOnInit();
    expect(loadInterviews).toHaveBeenCalled();
    expect(loadProfile).toHaveBeenCalled();
  });

  it('scoreColor() maps scores to badge classes', () => {
    expect(component.scoreColor(null)).toBe('badge-ghost');
    expect(component.scoreColor(9)).toBe('badge-success');
    expect(component.scoreColor(6)).toBe('badge-warning');
    expect(component.scoreColor(3)).toBe('badge-error');
  });

  it('roleLabel() uses You for practice session user messages', () => {
    expect(component.roleLabel('user', true)).toBe('You');
    expect(component.roleLabel('assistant', true)).toBe('AI twin');
    expect(component.roleLabel('user', false)).toBe('Recruiter');
  });
});
