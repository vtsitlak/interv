import { inject, Injectable } from '@angular/core';
import type { Profile, ProfileLink, QAPair } from '@interv/models';
import {
  buildFullPersonalQAQuestions,
  buildPersonalQAQuestionsFromProfile,
  canGenerateRoleSpecificPersonalQA,
  toQAPairs,
} from './personal-qa-questions';
import { ProfileService } from './profile.service';
import { ProfileStore } from './profile.store';

@Injectable({ providedIn: 'root' })
export class ProfileFacade {
  private readonly store = inject(ProfileStore);
  private readonly profileService = inject(ProfileService);

  readonly profile = this.store.profile;
  readonly isLoading = this.store.isLoading;
  readonly isSaving = this.store.isSaving;
  readonly isIngesting = this.store.isIngesting;
  readonly error = this.store.error;
  readonly successMessage = this.store.successMessage;
  readonly isComplete = this.store.isComplete;
  readonly isDiscoverableByRecruiters = this.store.isDiscoverableByRecruiters;
  readonly isUpdatingVisibility = this.store.isUpdatingVisibility;
  readonly shareUrl = this.store.shareUrl;

  loadProfile(): Promise<void> {
    return this.store.loadProfile();
  }

  saveProfile(data: Partial<Profile>): Promise<void> {
    return this.store.saveProfile(data);
  }

  setProfileDiscoverability(isPublished: boolean): Promise<void> {
    return this.store.setProfileDiscoverability(isPublished);
  }

  ingestToRAG(
    profileId: string,
    cvText: string,
    personalQA: QAPair[],
    links: ProfileLink[] = [],
  ): Promise<void> {
    return this.store.ingestToRAG(profileId, cvText, personalQA, links);
  }

  reportInvalidForm(): void {
    this.store.reportInvalidForm();
  }

  clearMessages(): void {
    this.store.clearMessages();
  }

  /** Generate personal Q&A prompts from job title and summary (API + client fallback). */
  async buildPersonalQA(
    profileId: string | null,
    title: string,
    summary: string,
  ): Promise<QAPair[]> {
    const context = { title, summary };
    const fromClient = buildPersonalQAQuestionsFromProfile(context);

    const fromApi =
      profileId != null && canGenerateRoleSpecificPersonalQA(title, summary)
        ? await this.profileService.fetchPersonalQAQuestionsFromApi(
            profileId,
            title,
            summary,
          )
        : [];

    return toQAPairs(
      buildFullPersonalQAQuestions([fromClient, fromApi], context),
    );
  }
}
