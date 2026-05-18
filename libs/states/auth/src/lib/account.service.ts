import { inject, Injectable } from '@angular/core';
import { doc, Firestore, getDoc, setDoc } from '@angular/fire/firestore';

export type UserRole = 'candidate' | 'recruiter';

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly firestore = inject(Firestore);

  async getRole(uid: string): Promise<UserRole> {
    const snap = await getDoc(doc(this.firestore, 'users', uid));
    if (!snap.exists()) {
      return 'candidate';
    }
    const role = snap.data()['role'];
    return role === 'recruiter' ? 'recruiter' : 'candidate';
  }

  async setRole(uid: string, role: UserRole): Promise<void> {
    await setDoc(
      doc(this.firestore, 'users', uid),
      { role, updatedAt: new Date().toISOString() },
      { merge: true },
    );
  }
}
