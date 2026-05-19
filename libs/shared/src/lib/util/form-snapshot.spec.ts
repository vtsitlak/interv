import { describe, expect, it } from 'vitest';
import {
  serializeFeedbackForm,
  serializeProfileTrainForm,
  serializeRecruiterForm,
} from './form-snapshot';

describe('form-snapshot', () => {
  it('serializeProfileTrainForm normalizes whitespace and sort order', () => {
    const first = serializeProfileTrainForm({
      name: ' Ada ',
      title: 'Engineer',
      photo: '',
      summary: 'Summary',
      cvText: 'CV',
      linkedIn: '',
      workPreferences: ['remote', 'full-time'],
      links: [{ link: ' https://a.com ', description: ' A ' }],
      personalQA: [{ question: ' Q ', answer: ' A ' }],
    });
    const second = serializeProfileTrainForm({
      name: 'Ada',
      title: 'Engineer',
      photo: '',
      summary: 'Summary',
      cvText: 'CV',
      linkedIn: '',
      workPreferences: ['full-time', 'remote'],
      links: [{ link: 'https://a.com', description: 'A' }],
      personalQA: [{ question: 'Q', answer: 'A' }],
    });

    expect(first).toBe(second);
  });

  it('serializeRecruiterForm trims fields', () => {
    expect(
      serializeRecruiterForm({
        name: ' Jane ',
        role: 'Recruiter',
        company: 'Acme',
      }),
    ).toBe(
      serializeRecruiterForm({
        name: 'Jane',
        role: 'Recruiter',
        company: 'Acme',
      }),
    );
  });

  it('serializeFeedbackForm clamps score', () => {
    expect(
      serializeFeedbackForm({ score: 12, text: ' Great ', requestContact: true }),
    ).toBe(
      serializeFeedbackForm({ score: 10, text: 'Great', requestContact: true }),
    );
  });
});
