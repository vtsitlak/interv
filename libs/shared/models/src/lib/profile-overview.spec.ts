import { describe, expect, it } from 'vitest';
import { buildProfileOverview } from './profile-overview';

describe('buildProfileOverview', () => {
  it('combines name, title, bio, skills, and LinkedIn', () => {
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
    expect(text).toContain('Core skills: Angular, TypeScript.');
    expect(text).toContain('LinkedIn profile is listed');
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
