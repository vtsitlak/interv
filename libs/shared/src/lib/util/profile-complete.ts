import type { Profile } from '../models/profile';

export const PROFILE_TWIN_INCOMPLETE_MESSAGE =
  'Complete your profile to activate your twin';

export const PROFILE_TWIN_INCOMPLETE_HINT =
  'Save and train your AI profile before running a test interview.';

type ProfileCompletenessFields = Pick<
  Profile,
  'name' | 'username' | 'title' | 'summary' | 'cvText'
>;

export function isProfileComplete(
  profile: ProfileCompletenessFields | null | undefined,
): boolean {
  return !!(
    profile?.name &&
    profile?.username &&
    profile?.title &&
    profile?.summary &&
    profile?.cvText
  );
}
