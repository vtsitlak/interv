import { describe, expect, it } from 'vitest';
import { isRecruiterProfileComplete } from './recruiter.models';

describe('isRecruiterProfileComplete', () => {
  it('returns false when required fields are missing', () => {
    expect(
      isRecruiterProfileComplete({
        uid: 'r1',
        name: '',
        company: 'Acme',
        role: 'Recruiter',
        profileComplete: false,
        updatedAt: null,
      }),
    ).toBe(false);
  });

  it('returns true when name, company, and role are set', () => {
    expect(
      isRecruiterProfileComplete({
        uid: 'r1',
        name: 'Jane',
        company: 'Acme',
        role: 'Recruiter',
        profileComplete: true,
        updatedAt: null,
      }),
    ).toBe(true);
  });
});
