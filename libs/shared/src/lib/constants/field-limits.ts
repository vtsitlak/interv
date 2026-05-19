export const PROFILE_FIELD_LIMITS = {
  name: 120,
  title: 120,
  summary: 1000,
  cvText: 50_000,
  linkedIn: 100,
  linkUrl: 100,
  linkDescription: 500,
  qaQuestion: 300,
  qaAnswer: 2000,
} as const;

export const RECRUITER_FIELD_LIMITS = {
  name: 120,
  role: 120,
  company: 120,
} as const;

export const FEEDBACK_FIELD_LIMITS = {
  text: 2000,
} as const;
