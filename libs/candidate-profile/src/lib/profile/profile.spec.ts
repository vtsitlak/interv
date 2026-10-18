import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ProfileService } from '@interv/state-profile';
import { RecruiterFacade } from '@interv/state-recruiter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ProfileComponent } from './profile';

const adaProfile = {
  id: 'p1',
  userId: 'p1',
  name: 'Ada Lovelace',
  username: 'ada',
  title: 'Engineer',
  photo: '',
  summary: 'Hello',
  cvText: 'CV',
  skills: ['Angular', 'TypeScript'],
  linkedIn: 'https://www.linkedin.com/in/ada',
  showFullNameOnPublicProfile: true,
  isPublicProfileEnabled: true,
  links: [
    {
      description: 'My GitHub profile',
      link: 'https://github.com/ada',
    },
  ],
};

describe('ProfileComponent', () => {
  let fixture: ComponentFixture<ProfileComponent>;
  let component: ProfileComponent;
  let resolvePublicProfile: ReturnType<typeof vi.fn>;
  let getProfile: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    resolvePublicProfile = vi.fn().mockResolvedValue({
      profile: adaProfile,
      uid: 'p1',
      canonicalUsername: 'ada',
      shouldRedirectToUsername: false,
    });
    getProfile = vi.fn().mockResolvedValue(adaProfile);

    await TestBed.configureTestingModule({
      imports: [ProfileComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ profileId: 'ada' }),
              queryParamMap: convertToParamMap({}),
              data: { ownerMode: false },
              url: [{ path: 'ada' }],
            },
          },
        },
        {
          provide: ProfileService,
          useValue: {
            currentUserOrNull: vi.fn().mockResolvedValue(null),
            resolvePublicProfile,
            getProfile,
          },
        },
        {
          provide: RecruiterFacade,
          useValue: {
            loadProfile: vi.fn().mockResolvedValue(undefined),
            loadInterviews: vi.fn().mockResolvedValue(undefined),
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

  it('shows train-form summary under the role', () => {
    expect(fixture.nativeElement.textContent).toContain('Hello');
  });

  it('shows link URLs without link descriptions on the profile', () => {
    const text = fixture.nativeElement.textContent ?? '';
    expect(text).toContain('https://github.com/ada');
    expect(text).not.toContain('My GitHub profile');
  });

  it('shows CV overview in profile overview section when trained', async () => {
    resolvePublicProfile.mockResolvedValueOnce({
      profile: {
        ...adaProfile,
        summary: 'My short pitch from the summary field.',
        careerOverview: 'Ada has spent a decade shipping web platforms.',
      },
      uid: 'p1',
      canonicalUsername: 'ada',
      shouldRedirectToUsername: false,
    });
    await component.ngOnInit();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain(
      'My short pitch from the summary field.',
    );
    expect(component.profileOverview()).toBe(
      'Ada has spent a decade shipping web platforms.',
    );
  });

  it('hides invalid career overview placeholder text', async () => {
    resolvePublicProfile.mockResolvedValueOnce({
      profile: {
        ...adaProfile,
        summary: 'My summary field text.',
        careerOverview:
          'Sentence 1: Introduction, core identity, and experience level',
      },
      uid: 'p1',
      canonicalUsername: 'ada',
      shouldRedirectToUsername: false,
    });
    await component.ngOnInit();
    await fixture.whenStable();
    expect(component.profileOverview()).toContain('Save and train your profile');
    expect(component.profileOverview()).not.toContain('Sentence 1');
  });

  it('hides full name on public profile when opted out', async () => {
    resolvePublicProfile.mockResolvedValueOnce({
      profile: {
        ...adaProfile,
        showFullNameOnPublicProfile: false,
      },
      uid: 'p1',
      canonicalUsername: 'ada',
      shouldRedirectToUsername: false,
    });
    await component.ngOnInit();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.publicDisplayName()).toBe('@ada');
    expect(fixture.nativeElement.textContent).toContain('@ada');
    expect(fixture.nativeElement.textContent).not.toContain('Ada Lovelace');
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
              url: [],
            },
          },
        },
        {
          provide: ProfileService,
          useValue: {
            currentUserOrNull: vi.fn().mockResolvedValue({ uid: 'p1' }),
            getProfile: vi.fn().mockResolvedValue({
              id: 'p1',
              name: 'Ada Lovelace',
              title: 'Engineer',
              photo: '',
              summary: '',
              cvText: '',
              skills: [],
              links: [],
            }),
            resolvePublicProfile,
          },
        },
        {
          provide: RecruiterFacade,
          useValue: {
            loadProfile: vi.fn().mockResolvedValue(undefined),
            loadInterviews: vi.fn().mockResolvedValue(undefined),
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
      ownerFixture.nativeElement.querySelector(
        'a[routerlink="/candidate/test-interview"]',
      ),
    ).toBeNull();
  });
});
