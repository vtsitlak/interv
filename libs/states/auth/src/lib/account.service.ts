import { inject, Injectable } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { doc, Firestore, getDoc, setDoc } from '@angular/fire/firestore';
import { API_URL } from '@interv/shared';
import type { User } from 'firebase/auth';
import { filter, firstValueFrom, map, race, take, timer } from 'rxjs';

export type UserRole = 'candidate' | 'recruiter';

const CURRENT_USER_TIMEOUT_MS = 5000;

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly firestore = inject(Firestore);
  private readonly auth = inject(Auth);
  private readonly apiUrl = inject(API_URL);

  async hasRole(uid: string): Promise<boolean> {
    const snap = await getDoc(doc(this.firestore, 'users', uid));
    return snap.exists();
  }

  async getRole(uid: string): Promise<UserRole | null> {
    const snap = await getDoc(doc(this.firestore, 'users', uid));
    if (!snap.exists()) {
      return null;
    }
    const role = snap.data()['role'];
    return role === 'recruiter' ? 'recruiter' : 'candidate';
  }

  /** Legacy users without a role document are treated as candidates. */
  async getRoleOrDefault(uid: string): Promise<UserRole> {
    return (await this.getRole(uid)) ?? 'candidate';
  }

  async setRole(uid: string, role: UserRole): Promise<void> {
    await setDoc(
      doc(this.firestore, 'users', uid),
      { role, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  }

  async resetCandidateProfile(): Promise<void> {
    const response = await fetch(`${this.apiUrl}/accounts/reset-profile`, {
      method: 'POST',
      headers: await this.authHeaders(),
    });
    if (!response.ok) {
      throw await this.readApiError(response, 'Profile reset failed');
    }
  }

  async deleteAccount(): Promise<void> {
    const response = await fetch(`${this.apiUrl}/accounts/me`, {
      method: 'DELETE',
      headers: await this.authHeaders(),
    });
    if (!response.ok) {
      throw await this.readApiError(response, 'Account deletion failed');
    }
  }

  private currentUserOrNull(): Promise<User | null> {
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

  private async authHeaders(): Promise<Record<string, string>> {
    const user = await this.currentUserOrNull();
    if (!user) {
      throw new Error('You must be signed in to perform this action.');
    }
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }

  private async readApiError(
    response: Response,
    fallback: string,
  ): Promise<Error> {
    const detail = (await response.text().catch(() => '')).slice(0, 300);
    return new Error(detail || `${fallback} (${response.status})`);
  }
}
