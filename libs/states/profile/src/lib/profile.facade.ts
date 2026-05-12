import { inject, Injectable } from '@angular/core';
import type { Profile, QAPair } from '@interv/models';
import { ProfileStore } from './profile.store';

@Injectable({ providedIn: 'root' })
export class ProfileFacade {
  private readonly store = inject(ProfileStore);

  readonly profile = this.store.profile;
  readonly isLoading = this.store.isLoading;
  readonly isSaving = this.store.isSaving;
  readonly isIngesting = this.store.isIngesting;
  readonly error = this.store.error;
  readonly successMessage = this.store.successMessage;
  readonly isComplete = this.store.isComplete;
  readonly shareUrl = this.store.shareUrl;

  loadProfile(): Promise<void> {
    return this.store.loadProfile();
  }

  saveProfile(data: Partial<Profile>): Promise<void> {
    return this.store.saveProfile(data);
  }

  ingestToRAG(
    profileId: string,
    cvText: string,
    personalQA: QAPair[],
  ): Promise<void> {
    return this.store.ingestToRAG(profileId, cvText, personalQA);
  }

  reportInvalidForm(): void {
    this.store.reportInvalidForm();
  }

  clearMessages(): void {
    this.store.clearMessages();
  }
}
