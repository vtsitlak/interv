export type InterviewHiddenAudience = 'recruiter' | 'candidate';

export function parseInterviewHidden(value: unknown): InterviewHiddenAudience[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter(
    (entry): entry is InterviewHiddenAudience =>
      entry === 'recruiter' || entry === 'candidate',
  );
}

export function isHiddenFromAudience(
  hidden: unknown,
  audience: InterviewHiddenAudience,
): boolean {
  return parseInterviewHidden(hidden).includes(audience);
}
