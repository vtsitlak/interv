import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RecruiterFacade } from '@interv/state-recruiter';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RecruiterProfileComponent } from './recruiter-profile';

describe('RecruiterProfileComponent', () => {
  let fixture: ComponentFixture<RecruiterProfileComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecruiterProfileComponent],
      providers: [
        provideRouter([]),
        {
          provide: RecruiterFacade,
          useValue: {
            loadProfile: vi.fn().mockResolvedValue(undefined),
            saveProfile: vi.fn().mockResolvedValue(undefined),
            profile: () => ({
              uid: 'r1',
              name: 'Jane',
              company: 'Acme',
              role: 'Recruiter',
              profileComplete: true,
              updatedAt: null,
            }),
            profileLoading: () => false,
            profileSaving: () => false,
            profileError: () => null,
            isProfileComplete: () => true,
            error: () => null,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(RecruiterProfileComponent);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
