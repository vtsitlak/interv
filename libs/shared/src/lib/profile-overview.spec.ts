import { describe, expect, it } from 'vitest';
import { buildProfileOverview } from './profile-overview';

describe('buildProfileOverview', () => {
  it('prefers AI career overview when present', () => {
    const text = buildProfileOverview({
      name: 'Ada Lovelace',
      title: 'Software Engineer',
      summary: 'Short manual summary.',
      careerOverview:
        'Ada is a full-stack engineer with eight years building SaaS products.',
      skills: ['Angular', 'TypeScript'],
      linkedIn: 'https://www.linkedin.com/in/ada',
      personalQA: [],
    });

    expect(text).toContain('eight years building SaaS');
    expect(text).not.toContain('Core skills');
    expect(text).not.toContain('Short manual summary');
  });

  it('falls back to composed text when career overview is missing', () => {
    const text = buildProfileOverview({
      name: 'Ada Lovelace',
      title: 'Software Engineer',
      summary: 'Builds reliable web apps.',
      skills: ['Angular', 'TypeScript'],
      linkedIn: 'https://www.linkedin.com/in/ada',
      personalQA: [],
    });

    expect(text).toContain('Ada Lovelace is a Software Engineer.');
    expect(text).toContain('Builds reliable web apps.');
    expect(text).not.toContain('Core skills');
  });

  it('returns fallback when profile is empty', () => {
    expect(
      buildProfileOverview({
        name: '',
        title: '',
        summary: '',
        skills: [],
        personalQA: [],
      }),
    ).toContain('not added profile details');
  });
});
