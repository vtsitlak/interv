import { inject, Injectable } from '@angular/core';
import { doc, Firestore, getDoc, setDoc } from '@angular/fire/firestore';

export type UserRole = 'candidate' | 'recruiter';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly firestore = inject(Firestore);

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
}
