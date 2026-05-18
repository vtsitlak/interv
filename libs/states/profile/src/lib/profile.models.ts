import type { Profile } from '@interv/models';

export interface ProfileState {
  profile: Profile | null;
  isSaving: boolean;
  isUpdatingVisibility: boolean;
  isIngesting: boolean;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

export const profileInitialState: ProfileState = {
  profile: null,
  isSaving: false,
  isUpdatingVisibility: false,
  isIngesting: false,
  isLoading: false,
  error: null,
  successMessage: null,
};

export const PROFILE_SAVED_MESSAGE =
  'Profile saved. Your CV and answers were sent to train your AI.';

export const INVALID_FORM_MESSAGE =
  'Please fill in full name, job title, summary, and CV text (all required).';

export const NOT_SIGNED_IN_LOAD_MESSAGE =
  'You must be signed in to load your profile.';

export const NOT_SIGNED_IN_SAVE_MESSAGE =
  'You must be signed in to save your profile.';

export function errMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
