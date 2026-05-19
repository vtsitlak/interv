import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { AuthFacade } from '@interv/state-auth';
import { InterviewService } from '@interv/state-interview';
import { ProfileService } from '@interv/state-profile';
import { RecruiterFacade } from '@interv/state-recruiter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileComponent } from './profile';

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ profileId: 'p1' }),
              queryParamMap: convertToParamMap({}),
              data: { ownerMode: false },
            },
          },
        },
        {
          provide: InterviewService,
          useValue: {
            getPublicProfile: vi.fn().mockResolvedValue({
              id: 'p1',
              name: 'Ada Lovelace',
              title: 'Engineer',
              photo: '',
              summary: 'Hello',
              skills: ['Angular', 'TypeScript'],
              linkedIn: 'https://www.linkedin.com/in/ada',
              links: [
                {
                  description: 'My GitHub profile',
                  link: 'https://github.com/ada',
                },
              ],
            }),
            getInterviewForReview: vi.fn().mockResolvedValue(null),
            getLatestInterviewWithFeedback: vi.fn().mockResolvedValue(null),
          },
        },
        {
          provide: ProfileService,
          useValue: {
            currentUserOrNull: vi.fn().mockResolvedValue(null),
          },
        },
        {
          provide: RecruiterFacade,
          useValue: {
            loadProfile: vi.fn().mockResolvedValue(undefined),
            profile: () => null,
            isProfileComplete: () => true,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProfileComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
    await component.ngOnInit();
    await fixture.whenStable();
  });

  it('should create and load profile', () => {
    expect(component).toBeTruthy();
    expect(component.profile()?.name).toBe('Ada Lovelace');
    expect(component.skills()).toContain('Angular');
    expect(component.linkedInUrl()).toBe('https://www.linkedin.com/in/ada');
  });

  it('builds profile overview from loaded profile', () => {
    expect(component.profileOverview()).toContain('Ada Lovelace is a Engineer.');
    expect(component.profileOverview()).toContain('Core skills: Angular');
  });

  it('disables test interview on owner view when profile is incomplete', async () => {
    TestBed.resetTestingModule();
    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ profileId: 'p1' }),
              queryParamMap: convertToParamMap({}),
              data: { ownerMode: true },
            },
          },
        },
        {
          provide: ProfileService,
          useValue: {
            currentUserOrNull: vi.fn().mockResolvedValue({ uid: 'p1' }),
          },
        },
        {
          provide: InterviewService,
          useValue: {
            getPublicProfile: vi.fn().mockResolvedValue({
              id: 'p1',
              name: 'Ada Lovelace',
              title: 'Engineer',
              photo: '',
              summary: '',
              cvText: '',
              skills: [],
              links: [],
            }),
          },
        },
        {
          provide: RecruiterFacade,
          useValue: {
            loadProfile: vi.fn().mockResolvedValue(undefined),
            profile: () => null,
            isProfileComplete: () => false,
          },
        },
      ],
    }).compileComponents();

    const ownerFixture = TestBed.createComponent(ProfileComponent);
    ownerFixture.detectChanges();
    await ownerFixture.whenStable();
    await vi.waitFor(() => {
      expect(ownerFixture.componentInstance.isLoading()).toBe(false);
      expect(ownerFixture.componentInstance.profile()).not.toBeNull();
    });
    ownerFixture.detectChanges();

    expect(ownerFixture.componentInstance.isOwnerView()).toBe(true);
    expect(ownerFixture.componentInstance.canTestInterview()).toBe(false);
    expect(
      ownerFixture.nativeElement.querySelector('button.btn-disabled'),
    ).toBeTruthy();
    expect(
      ownerFixture.nativeElement.querySelector('a[routerlink="/candidate/test-interview"]'),
    ).toBeNull();
  });
});
