import { describe, expect, it } from 'vitest';
import {
  buildFullPersonalQAQuestions,
  buildPersonalQAQuestionsFromProfile,
  canGenerateRoleSpecificPersonalQA,
  GENERAL_PERSONAL_QA_QUESTIONS,
  hasPersonalQAAnswers,
  isValidRoleSpecificQuestion,
  ROLE_SPECIFIC_PERSONAL_QA_LIMIT,
} from './personal-qa-questions';

describe('GENERAL_PERSONAL_QA_QUESTIONS', () => {
  it('includes six general prompts', () => {
    expect(GENERAL_PERSONAL_QA_QUESTIONS).toHaveLength(6);
    expect(GENERAL_PERSONAL_QA_QUESTIONS[0]).toContain('working environment');
  });
});

describe('isValidRoleSpecificQuestion', () => {
  it('rejects truncated role placeholders', () => {
    expect(isValidRoleSpecificQuestion('What motivated you to pursue a career as a S?', 'S')).toBe(
      false,
    );
    expect(
      isValidRoleSpecificQuestion(
        'What motivated you to pursue a career as a Senior Frontend Developer?',
        'Senior Frontend Developer',
      ),
    ).toBe(true);
  });
});

describe('canGenerateRoleSpecificPersonalQA', () => {
  it('requires enough title or summary text', () => {
    expect(canGenerateRoleSpecificPersonalQA('S', '')).toBe(false);
    expect(
      canGenerateRoleSpecificPersonalQA(
        'Senior Frontend Developer',
        'Short',
      ),
    ).toBe(true);
  });
});

describe('buildPersonalQAQuestionsFromProfile', () => {
  it('uses job title and summary for role-specific prompts', () => {
    const questions = buildPersonalQAQuestionsFromProfile({
      title: 'Senior Frontend Engineer',
      summary: 'Angular specialist building SaaS products.',
    });

    expect(questions.length).toBeLessThanOrEqual(ROLE_SPECIFIC_PERSONAL_QA_LIMIT);
    expect(questions.some((q) => q.includes('Senior Frontend Engineer'))).toBe(
      true,
    );
    expect(questions.every((q) => q.endsWith('?'))).toBe(true);
  });
});

describe('buildFullPersonalQAQuestions', () => {
  it('prepends general questions and appends up to six generated ones', () => {
    const all = buildFullPersonalQAQuestions(
      [['What is unique about your approach to system design?']],
      {
        title: 'Software Engineer',
        summary: 'Backend APIs and distributed systems.',
      },
    );

    expect(all[0]).toBe(GENERAL_PERSONAL_QA_QUESTIONS[0]);
    expect(all.length).toBeGreaterThanOrEqual(7);
    expect(all.length).toBeLessThanOrEqual(
      GENERAL_PERSONAL_QA_QUESTIONS.length + ROLE_SPECIFIC_PERSONAL_QA_LIMIT,
    );
  });
});

describe('hasPersonalQAAnswers', () => {
  it('detects answered items', () => {
    expect(hasPersonalQAAnswers([{ question: 'Q', answer: 'A' }])).toBe(true);
    expect(hasPersonalQAAnswers([{ question: 'Q', answer: '' }])).toBe(false);
  });
});
