import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withState,
} from '@ngrx/signals';
import type { Profile, ProfileLink, QAPair } from '@interv/models';
import {
  errMessage,
  INVALID_FORM_MESSAGE,
  NOT_SIGNED_IN_LOAD_MESSAGE,
  NOT_SIGNED_IN_SAVE_MESSAGE,
  PROFILE_SAVED_MESSAGE,
  profileInitialState,
  type ProfileState,
} from './profile.models';
import { ProfileService } from './profile.service';

export const ProfileStore = signalStore(
  { providedIn: 'root' },
  withState<ProfileState>(profileInitialState),
  withComputed(({ profile }) => ({
    isComplete: computed(() => {
      const p = profile();
      return !!(p?.name && p?.title && p?.summary && p?.cvText);
    }),
    shareUrl: computed(() => {
      const p = profile();
      return p ? `/p/${p.id}` : null;
    }),
  })),
  withMethods((store) => {
    const profileService = inject(ProfileService);

    return {
      async loadProfile(): Promise<void> {
        const user = await profileService.currentUserOrNull();
        if (!user) {
          patchState(store, {
            error: NOT_SIGNED_IN_LOAD_MESSAGE,
            isLoading: false,
            successMessage: null,
          });
          return;
        }

        patchState(store, {
          isLoading: true,
          error: null,
          successMessage: null,
        });
        try {
          const profile = await profileService.getProfile(user.uid);
          patchState(store, { profile, isLoading: false });
        } catch (e: unknown) {
          patchState(store, {
            error: errMessage(e),
            isLoading: false,
            successMessage: null,
          });
        }
      },

      async saveProfile(data: Partial<Profile>): Promise<void> {
        const user = await profileService.currentUserOrNull();
        if (!user) {
          patchState(store, {
            error: NOT_SIGNED_IN_SAVE_MESSAGE,
            isSaving: false,
            successMessage: null,
          });
          return;
        }

        patchState(store, {
          isSaving: true,
          error: null,
          successMessage: null,
        });
        try {
          const profile = await profileService.saveProfile(
            user.uid,
            data,
            store.profile(),
          );
          patchState(store, { profile, isSaving: false });
        } catch (e: unknown) {
          patchState(store, {
            error: errMessage(e),
            isSaving: false,
            successMessage: null,
          });
        }
      },

      async ingestToRAG(
        profileId: string,
        cvText: string,
        personalQA: QAPair[],
        links: ProfileLink[] = [],
      ): Promise<void> {
        patchState(store, {
          isIngesting: true,
          error: null,
          successMessage: null,
        });
        try {
          const result = await profileService.ingest(
            profileId,
            cvText,
            personalQA,
            links,
          );
          let successMessage = PROFILE_SAVED_MESSAGE;
          if (result.linksScraped && result.linksScraped > 0) {
            successMessage += ` Ingested content from ${result.linksScraped} link(s).`;
          }
          if (result.skippedReason) {
            successMessage += ` ${result.skippedReason}`;
          }
          patchState(store, {
            isIngesting: false,
            successMessage,
            error: null,
          });
        } catch (e: unknown) {
          patchState(store, {
            error: errMessage(e),
            isIngesting: false,
            successMessage: null,
          });
        }
      },

      reportInvalidForm(): void {
        patchState(store, {
          error: INVALID_FORM_MESSAGE,
          successMessage: null,
        });
      },

      clearMessages(): void {
        patchState(store, { error: null, successMessage: null });
      },
    };
  }),
);
