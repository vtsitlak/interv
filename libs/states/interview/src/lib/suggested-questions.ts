import type { Profile } from '@interv/shared';
import { formatWorkPreferencesList } from '@interv/shared';

const META_PREFIX = /^ask\s+(about|how)\b/i;

function ensureQuestion(text: string): string {
  const t = text.trim();
  if (!t || META_PREFIX.test(t)) {
    return '';
  }
  return t.endsWith('?') ? t : `${t.replace(/\.+$/, '')}?`;
}

/** Build recruiter questions from role, skills, summary, and Q&A — no generic hardcoded list. */
export function buildSuggestedQuestionsFromProfile(
  profile: Profile,
  limit = 5,
): string[] {
  const questions: string[] = [];
  const seen = new Set<string>();

  const title = profile.title?.trim() ?? '';
  const summary = profile.summary?.trim() ?? '';
  const skills = (profile.skills ?? []).map((s) => s.trim()).filter(Boolean);

  const add = (raw: string): void => {
    const q = ensureQuestion(raw);
    const key = q.toLowerCase();
    if (q && !seen.has(key) && questions.length < limit) {
      seen.add(key);
      questions.push(q);
    }
  };

  if (title) {
    add(
      `As a ${title}, what kind of work do you enjoy most in your day to day?`,
    );
    add(`What motivated you to build a career as a ${title}?`);
  }

  for (const skill of skills.slice(0, 4)) {
    add(`How have you used ${skill} in your recent work?`);
  }

  if (summary) {
    add(
      'Looking at your background, which accomplishment best represents the value you would bring to a new team?',
    );
  }

  for (const qa of profile.personalQA ?? []) {
    if (qa.question?.trim() && qa.answer?.trim()) {
      add(qa.question);
    }
  }

  for (const link of (profile.links ?? []).slice(0, 2)) {
    const href = link.link?.trim() ?? '';
    const description = link.description?.trim();
    if (
      description &&
      href &&
      !href.toLowerCase().includes('linkedin.com')
    ) {
      add(`What should I know from your ${description} that is not on your CV?`);
    }
  }

  const linkedIn = profile.linkedIn?.trim();
  if (linkedIn) {
    add(
      'What from your LinkedIn background would you want a recruiter to remember?',
    );
  }

  const workPrefs = formatWorkPreferencesList(profile.workPreferences);
  if (workPrefs) {
    add(
      `You are open to ${workPrefs} — what should a recruiter know about your availability and expectations?`,
    );
  }

  if (questions.length < limit && title) {
    add(
      `What would you want a hiring manager to understand about your strengths as a ${title}?`,
    );
  }

  return questions.slice(0, limit);
}

/** Guaranteed starter questions when the profile has little structured data. */
export function buildGenericFallbackQuestions(
  profile: Pick<Profile, 'name' | 'title'>,
  limit = 5,
): string[] {
  const title = profile.title?.trim() ?? '';
  const candidates = [
    'What should I know about your professional background?',
    'What are you most proud of in your recent work?',
    'What kind of role or team are you looking for next?',
    title
      ? `As a ${title}, what problems do you enjoy solving most?`
      : 'What strengths would you bring to a new team?',
    'Is there anything important we have not covered yet?',
  ];

  const questions: string[] = [];
  const seen = new Set<string>();
  for (const raw of candidates) {
    const q = ensureQuestion(raw);
    const key = q.toLowerCase();
    if (q && !seen.has(key) && questions.length < limit) {
      seen.add(key);
      questions.push(q);
    }
  }
  return questions;
}

/** Merge API, profile-derived, and generic questions; always aim for at least 3. */
export function mergeSuggestedQuestions(
  sources: string[][],
  profile: Pick<Profile, 'name' | 'title'>,
  limit = 5,
): string[] {
  const questions: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string): void => {
    const q = ensureQuestion(raw);
    const key = q.toLowerCase();
    if (q && !seen.has(key) && questions.length < limit) {
      seen.add(key);
      questions.push(q);
    }
  };

  for (const list of sources) {
    for (const item of list) {
      add(item);
    }
  }

  if (questions.length < 3) {
    for (const item of buildGenericFallbackQuestions(profile, limit)) {
      add(item);
    }
  }

  return questions.slice(0, limit);
}
