import { describe, expect, it } from 'vitest';
import type { Profile } from '@interv/shared';
import {
  buildGenericFallbackQuestions,
  buildSuggestedQuestionsFromProfile,
  mergeSuggestedQuestions,
} from './suggested-questions';

const sampleProfile = {
  id: 'p1',
  userId: 'p1',
  name: 'Ada Lovelace',
  title: 'Senior Frontend Engineer',
  photo: '',
  summary: 'Angular specialist with 8 years building SaaS products.',
  cvText: '...',
  skills: ['Angular'],
  personalQA: [
    {
      question: 'Are you open to relocation?',
      answer: 'Yes, within the EU.',
    },
  ],
  links: [
    {
      description: 'My GitHub profile',
      link: 'https://github.com/ada',
    },
  ],
  isPublished: true,
  shareUrl: '/candidate/p1',
} as unknown as Profile;

describe('buildSuggestedQuestionsFromProfile', () => {
  it('uses role, skills, and profile Q&A', () => {
    const questions = buildSuggestedQuestionsFromProfile(sampleProfile);

    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.some((q) => q.includes('Senior Frontend Engineer'))).toBe(
      true,
    );
    expect(questions.some((q) => q.includes('Angular'))).toBe(true);
    expect(questions.some((q) => q.includes('relocation'))).toBe(true);
    expect(questions.every((q) => q.endsWith('?'))).toBe(true);
  });

  it('returns empty when profile has no usable fields', () => {
    const empty = {
      ...sampleProfile,
      title: '',
      summary: '',
      skills: [],
      personalQA: [],
      links: [],
    };
    expect(buildSuggestedQuestionsFromProfile(empty)).toEqual([]);
  });
});

describe('mergeSuggestedQuestions', () => {
  it('merges partial API results with profile questions', () => {
    const merged = mergeSuggestedQuestions(
      [['What is your approach to testing?'], []],
      sampleProfile,
    );
    expect(merged.length).toBeGreaterThanOrEqual(3);
    expect(merged[0]).toContain('testing');
  });

  it('pads with generic fallbacks when sources are empty', () => {
    const merged = mergeSuggestedQuestions([[], []], {
      name: 'Ada',
      title: '',
    });
    expect(merged.length).toBeGreaterThanOrEqual(3);
  });
});

describe('buildGenericFallbackQuestions', () => {
  it('returns at least three questions', () => {
    expect(buildGenericFallbackQuestions({ name: 'Ada', title: '' }).length).toBe(
      5,
    );
  });
});
