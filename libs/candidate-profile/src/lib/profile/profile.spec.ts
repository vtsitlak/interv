import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { InterviewService } from '@interv/state-interview';
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

  it('hasProfilePhoto() is false for empty photo', () => {
    expect(component.hasProfilePhoto('')).toBe(false);
    expect(component.hasProfilePhoto('   ')).toBe(false);
    expect(component.hasProfilePhoto('https://example.com/p.jpg')).toBe(true);
  });
});
