import { describe, expect, it } from 'vitest';
import {
  isHiddenFromAudience,
  parseInterviewHidden,
} from './interview-visibility';

describe('interview-visibility', () => {
  it('parseInterviewHidden() returns an empty array for invalid values', () => {
    expect(parseInterviewHidden(undefined)).toEqual([]);
    expect(parseInterviewHidden(null)).toEqual([]);
    expect(parseInterviewHidden('candidate')).toEqual([]);
    expect(parseInterviewHidden(['invalid', 'candidate'])).toEqual(['candidate']);
  });

  it('isHiddenFromAudience() checks audience membership', () => {
    expect(isHiddenFromAudience(['candidate'], 'candidate')).toBe(true);
    expect(isHiddenFromAudience(['recruiter'], 'candidate')).toBe(false);
    expect(isHiddenFromAudience(['recruiter', 'candidate'], 'recruiter')).toBe(
      true,
    );
  });
});
