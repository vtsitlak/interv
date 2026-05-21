import { describe, expect, it } from 'vitest';
import {
  buildProfileOverview,
  isInvalidProfileOverview,
} from './profile-overview';

describe('isInvalidProfileOverview', () => {
  it('flags outline-style placeholder text', () => {
    expect(
      isInvalidProfileOverview(
        'Sentence 1: Introduction, core identity, and experience level',
      ),
    ).toBe(true);
  });

  it('accepts normal prose', () => {
    expect(
      isInvalidProfileOverview(
        'Alex is a senior front-end developer with eight years building Angular applications for enterprise clients.',
      ),
    ).toBe(false);
  });
});

describe('buildProfileOverview', () => {
  it('shows CV-generated overview when valid', () => {
    const text = buildProfileOverview({
      careerOverview:
        'Alex has spent eight years delivering Angular and TypeScript products for SaaS teams.',
    });
    expect(text).toContain('eight years');
  });

  it('hides invalid stored overview and prompts to train', () => {
    const text = buildProfileOverview({
      careerOverview: 'Sentence 1: Introduction, core identity, and experience level',
    });
    expect(text).toContain('Save and train your profile');
    expect(text).not.toContain('Sentence 1');
  });

  it('prompts to train when overview is missing', () => {
    expect(buildProfileOverview({})).toContain('Save and train your profile');
  });
});
