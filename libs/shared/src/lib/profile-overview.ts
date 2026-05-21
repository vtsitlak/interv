import type { Profile } from './models/profile';

type ProfileOverviewInput = Pick<
  Profile,
  'careerOverview'
>;

const TRAIN_TO_GENERATE_MESSAGE =
  'Save and train your profile to generate a work experience overview from your CV.';

/** Detect outline-style AI output that should not be shown on the profile page. */
export function isInvalidProfileOverview(text: string | undefined | null): boolean {
  const stripped = (text ?? '').trim();
  if (!stripped) {
    return true;
  }
  if (/^(sentence|paragraph|section|part)\s*\d+\s*[:.)-]/im.test(stripped)) {
    return true;
  }
  if (/introduction,\s*core identity/i.test(stripped)) {
    return true;
  }
  return false;
}

/** CV-generated work experience overview for the Profile overview section only. */
export function buildProfileOverview(profile: ProfileOverviewInput): string {
  const generated = profile.careerOverview?.trim();
  if (generated && !isInvalidProfileOverview(generated)) {
    return generated;
  }
  return TRAIN_TO_GENERATE_MESSAGE;
}
