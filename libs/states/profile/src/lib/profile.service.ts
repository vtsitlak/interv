import { inject, Injectable } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  doc,
  Firestore,
  getDoc,
  serverTimestamp,
  setDoc,
} from '@angular/fire/firestore';
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

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
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
      shareUrl: `/p/${uid}`,
      isPublished: true,
      updatedAt: serverTimestamp(),
      createdAt: existing?.createdAt ?? serverTimestamp(),
    };
    await setDoc(ref, payload, { merge: true });
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
      .filter((link) => link.url?.trim())
      .map((link) => ({
        label: link.label?.trim() ?? '',
        url: link.url.trim(),
      }));

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
}
