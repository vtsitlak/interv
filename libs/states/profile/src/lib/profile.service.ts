import { inject, Injectable } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  doc,
  Firestore,
  getDoc,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
import {
  getDownloadURL,
  ref,
  Storage,
  uploadBytes,
} from '@angular/fire/storage';
import type { User } from 'firebase/auth';
import { API_URL } from '@interv/util';
import type { Profile, ProfileLink, QAPair } from '@interv/models';

export interface IngestResult {
  linksScraped?: number;
  linksSkipped?: number;
  skippedReason?: string | null;
  warning?: string | null;
}
import { filter, firstValueFrom, map, race, take, timer } from 'rxjs';

const CURRENT_USER_TIMEOUT_MS = 5000;
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_PROFILE_PHOTO_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function validateProfilePhotoFile(file: File): string | null {
  if (!ALLOWED_PROFILE_PHOTO_TYPES.has(file.type)) {
    return 'Please choose a JPEG, PNG, or WebP image.';
  }
  if (file.size > MAX_PROFILE_PHOTO_BYTES) {
    return 'Image must be 2 MB or smaller.';
  }
  return null;
}

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly storage = inject(Storage);
  private readonly apiUrl = inject(API_URL);

  /**
   * Resolves the current Firebase user, waiting up to {@link CURRENT_USER_TIMEOUT_MS}
   * for `authState` to emit when the user is not yet hydrated.
   */
  currentUserOrNull(): Promise<User | null> {
    if (this.auth.currentUser) {
      return Promise.resolve(this.auth.currentUser);
    }
    return firstValueFrom(
      race(
        authState(this.auth).pipe(
          filter((u): u is User => u != null),
          take(1),
        ),
        timer(CURRENT_USER_TIMEOUT_MS).pipe(map((): User | null => null)),
      ),
    );
  }

  async getProfile(uid: string): Promise<Profile | null> {
    const snap = await getDoc(doc(this.firestore, `profiles/${uid}`));
    return snap.exists() ? (snap.data() as Profile) : null;
  }

  async uploadProfilePhoto(uid: string, file: File): Promise<string> {
    const validationError = validateProfilePhotoFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    const user = await this.currentUserOrNull();
    if (!user || user.uid !== uid) {
      throw new Error('You must be signed in to upload a photo.');
    }

    const ext = file.type === 'image/png'
      ? 'png'
      : file.type === 'image/webp'
        ? 'webp'
        : 'jpg';
    const path = `profiles/${uid}/photo.${ext}`;
    const storageRef = ref(this.storage, path);

    await uploadBytes(storageRef, file, { contentType: file.type });
    return getDownloadURL(storageRef);
  }

  private async authHeaders(
    json = true,
  ): Promise<Record<string, string>> {
    const user = await this.currentUserOrNull();
    if (!user) {
      throw new Error('You must be signed in to perform this action.');
    }
    const token = await user.getIdToken();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    if (json) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  async saveProfile(
    uid: string,
    data: Partial<Profile>,
    existing: Profile | null,
  ): Promise<Profile> {
    const ref = doc(this.firestore, `profiles/${uid}`);
    const payload = {
      ...data,
      id: uid,
      userId: uid,
      shareUrl: `/candidate/${uid}`,
      isPublished:
        data.isPublished !== undefined
          ? data.isPublished
          : (existing?.isPublished ?? true),
      updatedAt: serverTimestamp(),
      createdAt: existing?.createdAt ?? serverTimestamp(),
    };
    await setDoc(ref, payload, { merge: true });
    const refreshed = await getDoc(ref);
    return refreshed.data() as Profile;
  }

  async setProfileVisibility(uid: string, isPublished: boolean): Promise<Profile> {
    const existing = await this.getProfile(uid);
    if (!existing) {
      throw new Error(
        'Complete and save your profile first, then you can change visibility.',
      );
    }

    const ref = doc(this.firestore, `profiles/${uid}`);
    await setDoc(
      ref,
      { isPublished, updatedAt: serverTimestamp() },
      { merge: true },
    );
    const refreshed = await getDoc(ref);
    return refreshed.data() as Profile;
  }

  async ingest(
    profileId: string,
    cvText: string,
    personalQA: QAPair[],
    links: ProfileLink[] = [],
  ): Promise<IngestResult> {
    const url = `${this.apiUrl}/ingest/${profileId}`;
    const linkPayload = links
      .filter((link) => link.link?.trim())
      .map((link) => ({
        description: link.description?.trim() ?? '',
        link: link.link.trim(),
      }));

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: await this.authHeaders(),
        body: JSON.stringify({ cvText, personalQA, links: linkPayload }),
      });
    } catch {
      throw new Error(
        `Cannot reach the API at ${this.apiUrl}. Start the backend (npm run start:backend or npm run start:all) and confirm apiUrl in src/environments/environment.ts.`,
      );
    }
    if (!response.ok) {
      const detail = (await response.text().catch(() => '')).slice(0, 300);
      throw new Error(
        `Ingestion failed (${response.status})${detail ? `: ${detail}` : ''}`,
      );
    }

    const result = (await response.json()) as IngestResult;
    if (result.skippedReason) {
      console.warn('Intervai:', result.skippedReason);
    }
    if (result.warning) {
      console.warn('Intervai:', result.warning);
    }
    return result;
  }

  async fetchPersonalQAQuestionsFromApi(
    profileId: string,
    title: string,
    summary: string,
  ): Promise<string[]> {
    const params = new URLSearchParams();
    if (title.trim()) {
      params.set('title', title.trim());
    }
    if (summary.trim()) {
      params.set('summary', summary.trim());
    }
    const query = params.toString();
    const url = `${this.apiUrl}/profiles/${profileId}/personal-qa-questions${query ? `?${query}` : ''}`;
    try {
      const response = await fetch(url, {
        headers: await this.authHeaders(false),
      });
      if (!response.ok) {
        return [];
      }
      const data = (await response.json()) as { questions?: string[] };
      return (data.questions ?? []).map((q) => q.trim()).filter(Boolean);
    } catch {
      return [];
    }
  }
}
