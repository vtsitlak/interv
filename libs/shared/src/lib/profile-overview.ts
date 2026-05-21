import type { Profile, QAPair } from './models/profile';
import { formatWorkPreferencesList } from './models/work-preferences';

type ProfileOverviewInput = Pick<
  Profile,
  | 'name'
  | 'title'
  | 'summary'
  | 'careerOverview'
  | 'linkedIn'
  | 'workPreferences'
  | 'personalQA'
> & {
  skills?: string[];
};

function formatQaHighlight(qa: QAPair): string {
  return `On “${qa.question.trim()}”, they share: ${qa.answer.trim()}`;
}

/** Readable overview for the profile page (prefers AI career overview from training). */
export function buildProfileOverview(profile: ProfileOverviewInput): string {
  const generated = profile.careerOverview?.trim();
  if (generated) {
    return generated;
  }

  const paragraphs: string[] = [];

  const name = profile.name?.trim();
  const title = profile.title?.trim();
  if (name && title) {
    paragraphs.push(`${name} is a ${title}.`);
  } else if (name) {
    paragraphs.push(name);
  }

  const bio = profile.summary?.trim();
  if (bio) {
    paragraphs.push(bio);
  }

  const linkedIn = profile.linkedIn?.trim();
  if (linkedIn) {
    paragraphs.push('LinkedIn profile is listed on their public page.');
  }

  const workPrefs = formatWorkPreferencesList(profile.workPreferences);
  if (workPrefs) {
    paragraphs.push(`Work preferences: ${workPrefs}.`);
  }

  const qa = (profile.personalQA ?? []).filter(
    (pair: QAPair) => pair.question?.trim() && pair.answer?.trim(),
  );
  if (qa.length > 0) {
    paragraphs.push(formatQaHighlight(qa[0]));
  }

  if (paragraphs.length === 0) {
    return 'This candidate has not added profile details yet.';
  }

  return paragraphs.join('\n\n');
}
