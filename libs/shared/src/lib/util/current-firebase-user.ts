import { Auth, authState } from '@angular/fire/auth';
import type { User } from 'firebase/auth';
import { filter, firstValueFrom, map, race, take, timer } from 'rxjs';

export const DEFAULT_FIREBASE_USER_TIMEOUT_MS = 5000;

/**
 * Resolves the current Firebase user, waiting up to `timeoutMs` for `authState`
 * to emit when the SDK has not hydrated `auth.currentUser` yet.
 */
export function currentFirebaseUserOrNull(
  auth: Auth,
  timeoutMs = DEFAULT_FIREBASE_USER_TIMEOUT_MS,
): Promise<User | null> {
  if (auth.currentUser) {
    return Promise.resolve(auth.currentUser);
  }
  return firstValueFrom(
    race(
      authState(auth).pipe(
        filter((user): user is User => user != null),
        take(1),
      ),
      timer(timeoutMs).pipe(map((): User | null => null)),
    ),
  );
}
