const META_PREFIX = /^ask\s+(about|how)\b/i;

/** Role-agnostic questions always shown on the profile editor. */
export const GENERAL_PERSONAL_QA_QUESTIONS = [
  "What's your ideal working environment?",
  'How do you handle conflict in a team?',
  'What are you looking for in your next role?',
  'What are your salary expectations?',
  'What kind of team culture do you thrive in?',
  'Which languages do you speak?',
] as const;

export const ROLE_SPECIFIC_PERSONAL_QA_LIMIT = 6;

/** Avoid role-specific prompts while the user is still typing a job title. */
export const MIN_TITLE_LENGTH_FOR_ROLE_QA = 8;
export const MIN_SUMMARY_LENGTH_FOR_ROLE_QA = 20;

function ensureQuestion(text: string): string {
  const t = text.trim();
  if (!t || META_PREFIX.test(t)) {
    return '';
  }
  return t.endsWith('?') ? t : `${t.replace(/\.+$/, '')}?`;
}

export function canGenerateRoleSpecificPersonalQA(
  title: string,
  summary: string,
): boolean {
  return (
    title.trim().length >= MIN_TITLE_LENGTH_FOR_ROLE_QA ||
    summary.trim().length >= MIN_SUMMARY_LENGTH_FOR_ROLE_QA
  );
}

/** Reject truncated titles like "S" that slipped into generated copy. */
export function isValidRoleSpecificQuestion(
  question: string,
  title: string,
): boolean {
  const q = question.trim();
  if (!q) {
    return false;
  }
  const truncatedRole = /as a ([^?,]{1,3})\?/i;
  if (truncatedRole.test(q)) {
    return false;
  }
  const role = title.trim();
  if (role.length < MIN_TITLE_LENGTH_FOR_ROLE_QA && role.length > 0) {
    if (q.toLowerCase().includes(`as a ${role.toLowerCase()}`)) {
      return false;
    }
  }
  return true;
}

/** Role/summary-specific questions for the candidate to answer on their profile. */
export function buildPersonalQAQuestionsFromProfile(
  input: { title?: string; summary?: string },
  limit = ROLE_SPECIFIC_PERSONAL_QA_LIMIT,
): string[] {
  const questions: string[] = [];
  const seen = new Set<string>();
  const title = input.title?.trim() ?? '';
  const summary = input.summary?.trim() ?? '';

  const add = (raw: string): void => {
    const q = ensureQuestion(raw);
    const key = q.toLowerCase();
    if (
      q &&
      !seen.has(key) &&
      questions.length < limit &&
      isValidRoleSpecificQuestion(q, title)
    ) {
      seen.add(key);
      questions.push(q);
    }
  };

  if (title.length >= MIN_TITLE_LENGTH_FOR_ROLE_QA) {
    add(`What motivated you to pursue a career as a ${title}?`);
    add(`What do you enjoy most about the day-to-day work of a ${title}?`);
    add(
      `What strengths do you bring as a ${title} that you want every recruiter conversation to cover?`,
    );
  }

  if (summary.length >= MIN_SUMMARY_LENGTH_FOR_ROLE_QA) {
    add(
      'Looking at your summary, which accomplishment best represents the impact you want to have next?',
    );
    add(
      'What should recruiters understand about your experience that a CV alone might not convey?',
    );
    add(
      'Is there a theme in your summary you want the AI to emphasize when recruiters interview you?',
    );
  }

  if (
    title.length >= MIN_TITLE_LENGTH_FOR_ROLE_QA &&
    summary.length >= MIN_SUMMARY_LENGTH_FOR_ROLE_QA
  ) {
    add(
      `How does your path as a ${title} connect to the direction you describe in your summary?`,
    );
  }

  return questions.slice(0, limit);
}

/** Fallback role-specific prompts when title/summary are thin. */
export function buildGenericFallbackPersonalQAQuestions(
  input: { title?: string; summary?: string },
  limit = ROLE_SPECIFIC_PERSONAL_QA_LIMIT,
): string[] {
  const title = input.title?.trim() ?? '';
  const candidates = [
    'What should recruiters know about your professional background?',
    'What are you most proud of in your recent work?',
    title
      ? `As a ${title}, what problems do you enjoy solving most?`
      : 'What strengths would you bring to a new team?',
    'How do you prefer to collaborate with managers and peers?',
    'What are your expectations around remote work, relocation, or travel?',
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

export function mergePersonalQAQuestions(
  sources: string[][],
  input: { title?: string; summary?: string },
  limit = ROLE_SPECIFIC_PERSONAL_QA_LIMIT,
): string[] {
  const questions: string[] = [];
  const seen = new Set<string>();

  const title = input.title?.trim() ?? '';

  const add = (raw: string): void => {
    const q = ensureQuestion(raw);
    const key = q.toLowerCase();
    if (
      q &&
      !seen.has(key) &&
      questions.length < limit &&
      isValidRoleSpecificQuestion(q, title)
    ) {
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
    for (const item of buildGenericFallbackPersonalQAQuestions(input, limit)) {
      add(item);
    }
  }

  return questions.slice(0, limit);
}

/** Six general questions plus up to six role/summary-specific questions. */
export function buildFullPersonalQAQuestions(
  sources: string[][],
  input: { title?: string; summary?: string },
): string[] {
  const general = GENERAL_PERSONAL_QA_QUESTIONS.map((q) =>
    ensureQuestion(q),
  ).filter(Boolean);
  const seen = new Set(general.map((q) => q.toLowerCase()));

  const generated = mergePersonalQAQuestions(sources, input);
  const uniqueGenerated = generated.filter((q) => !seen.has(q.toLowerCase()));

  return [...general, ...uniqueGenerated];
}

export function toQAPairs(questions: string[]): { question: string; answer: string }[] {
  return questions.map((question) => ({ question, answer: '' }));
}

/** True when the user has started answering saved Q&A. */
export function hasPersonalQAAnswers(
  personalQA: { question?: string; answer?: string }[] | undefined,
): boolean {
  return (personalQA ?? []).some((qa) => qa.answer?.trim());
}
