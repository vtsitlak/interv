import { describe, expect, it } from 'vitest';
import {
  isPracticeRecruiterInfo,
  PRACTICE_RECRUITER_INFO,
} from './interview.models';

describe('isPracticeRecruiterInfo', () => {
  it('returns true for practice session recruiter metadata', () => {
    expect(isPracticeRecruiterInfo(PRACTICE_RECRUITER_INFO)).toBe(true);
  });

  it('returns false for real recruiter metadata', () => {
    expect(
      isPracticeRecruiterInfo({
        name: 'Jane',
        role: 'Recruiter',
        company: 'Acme',
      }),
    ).toBe(false);
  });
});
