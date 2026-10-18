import { inject, Injectable } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import {
  doc,
  Firestore,
  getDoc,
  runTransaction,
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
import {
  API_URL,
  currentFirebaseUserOrNull,
  isValidUsernameFormat,
  normalizeUsername,
  publicSharePathForUsername,
  usernameFormatError,
} from '@interv/shared';
import type { Profile, ProfileLink, QAPair } from '@interv/shared';

export interface IngestResult {
  linksScraped?: number;
  linksSkipped?: number;
  skippedReason?: string | null;
  warning?: string | null;
}

export interface UsernameAvailability {
  available: boolean;
  normalized: string;
  message: string | null;
}

export interface ResolvedPublicProfile {
  profile: Profile;
  uid: string;
  /** Canonical public handle when set; otherwise null (legacy uid-only profiles). */
  canonicalUsername: string | null;
  /** True when the request handle was a Firebase uid (or stale alias) and a username exists. */
  shouldRedirectToUsername: boolean;
}

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
    return currentFirebaseUserOrNull(this.auth);
  }

  async getProfile(uid: string): Promise<Profile | null> {
    const snap = await getDoc(doc(this.firestore, `profiles/${uid}`));
    return snap.exists() ? (snap.data() as Profile) : null;
  }

  /**
   * Resolve a public route handle (`username` or legacy `uid`) to a profile.
   */
  async resolvePublicProfile(
    handle: string,
  ): Promise<ResolvedPublicProfile | null> {
    const raw = handle.trim();
    if (!raw) {
      return null;
    }

    const normalized = normalizeUsername(raw);
    const usernameSnap = await getDoc(
      doc(this.firestore, `usernames/${normalized}`),
    );
    if (usernameSnap.exists()) {
      const uid = String(usernameSnap.data()?.['uid'] ?? '');
      if (!uid) {
        return null;
      }
      const profile = await this.getProfile(uid);
      if (!profile) {
        return null;
      }
      const canonical = profile.username
        ? normalizeUsername(profile.username)
        : normalized;
      return {
        profile,
        uid,
        canonicalUsername: canonical,
        shouldRedirectToUsername: normalized !== canonical,
      };
    }

    const byUid = await this.getProfile(raw);
    if (!byUid) {
      return null;
    }
    const canonical = byUid.username
      ? normalizeUsername(byUid.username)
      : null;
    return {
      profile: byUid,
      uid: byUid.id || raw,
      canonicalUsername: canonical,
      shouldRedirectToUsername: !!canonical,
    };
  }

  async resolveProfileUid(handle: string): Promise<string | null> {
    const resolved = await this.resolvePublicProfile(handle);
    return resolved?.uid ?? null;
  }

  /**
   * Format + uniqueness check for Train profile blur / pre-save.
   * Own current username counts as available.
   */
  async checkUsernameAvailability(
    raw: string,
    currentUid: string,
  ): Promise<UsernameAvailability> {
    const formatError = usernameFormatError(raw);
    const normalized = normalizeUsername(raw);
    if (formatError) {
      return { available: false, normalized, message: formatError };
    }

    const snap = await getDoc(doc(this.firestore, `usernames/${normalized}`));
    if (!snap.exists()) {
      return { available: true, normalized, message: null };
    }
    const ownerUid = String(snap.data()?.['uid'] ?? '');
    if (ownerUid === currentUid) {
      return { available: true, normalized, message: null };
    }
    return {
      available: false,
      normalized,
      message: 'That username is already taken',
    };
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

  /**
   * Claim / persist username + share URL without a full profile train save.
   * Safe to call on Train profile blur once the handle is valid and available.
   */
  async claimUsername(
    uid: string,
    rawUsername: string,
    existing: Profile | null,
    showFullNameOnPublicProfile?: boolean,
  ): Promise<Profile> {
    const formatError = usernameFormatError(rawUsername);
    if (formatError) {
      throw new Error(formatError);
    }
    const username = normalizeUsername(rawUsername);
    if (!isValidUsernameFormat(username)) {
      throw new Error('Invalid username');
    }

    const showName =
      showFullNameOnPublicProfile !== undefined
        ? showFullNameOnPublicProfile
        : (existing?.showFullNameOnPublicProfile ?? true);
    const shareUrl = publicSharePathForUsername(username);
    const profileRef = doc(this.firestore, `profiles/${uid}`);
    const usernameRef = doc(this.firestore, `usernames/${username}`);

    await runTransaction(this.firestore, async (tx) => {
      const usernameSnap = await tx.get(usernameRef);
      if (usernameSnap.exists()) {
        const ownerUid = String(usernameSnap.data()?.['uid'] ?? '');
        if (ownerUid !== uid) {
          throw new Error('That username is already taken');
        }
      } else {
        tx.set(usernameRef, {
          uid,
          username,
          createdAt: serverTimestamp(),
        });
      }

      tx.set(
        profileRef,
        {
          id: uid,
          userId: uid,
          username,
          showFullNameOnPublicProfile: showName,
          shareUrl,
          isPublished: existing?.isPublished ?? true,
          isPublicProfileEnabled: existing?.isPublicProfileEnabled ?? true,
          updatedAt: serverTimestamp(),
          createdAt: existing?.createdAt ?? serverTimestamp(),
        },
        { merge: true },
      );
    });

    const refreshed = await getDoc(profileRef);
    return refreshed.data() as Profile;
  }

  async saveProfile(
    uid: string,
    data: Partial<Profile>,
    existing: Profile | null,
  ): Promise<Profile> {
    const usernameRaw = data.username ?? existing?.username ?? '';
    const showFullNameOnPublicProfile =
      data.showFullNameOnPublicProfile !== undefined
        ? data.showFullNameOnPublicProfile
        : (existing?.showFullNameOnPublicProfile ?? true);

    // Ensure the handle is claimed first (also writes username/shareUrl).
    await this.claimUsername(
      uid,
      String(usernameRaw),
      existing,
      showFullNameOnPublicProfile,
    );

    const username = normalizeUsername(String(usernameRaw));
    const shareUrl = publicSharePathForUsername(username);
    const profileRef = doc(this.firestore, `profiles/${uid}`);

    const payload: Record<string, unknown> = {
      ...data,
      id: uid,
      userId: uid,
      username,
      showFullNameOnPublicProfile,
      shareUrl,
      isPublished:
        data.isPublished !== undefined
          ? data.isPublished
          : (existing?.isPublished ?? true),
      isPublicProfileEnabled:
        data.isPublicProfileEnabled !== undefined
          ? data.isPublicProfileEnabled
          : (existing?.isPublicProfileEnabled ?? true),
      updatedAt: serverTimestamp(),
      createdAt: existing?.createdAt ?? serverTimestamp(),
    };
    await setDoc(profileRef, payload, { merge: true });

    const refreshed = await getDoc(profileRef);
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

  async setPublicProfileEnabled(
    uid: string,
    isPublicProfileEnabled: boolean,
  ): Promise<Profile> {
    const existing = await this.getProfile(uid);
    if (!existing) {
      throw new Error(
        'Complete and save your profile first, then you can change visibility.',
      );
    }

    const ref = doc(this.firestore, `profiles/${uid}`);
    await setDoc(
      ref,
      { isPublicProfileEnabled, updatedAt: serverTimestamp() },
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
