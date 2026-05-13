import { ApplicationConfig, type Injector } from '@angular/core';
import { provideRouter } from '@angular/router';
import { FirebaseApp, provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import {
  getFirestore,
  initializeFirestore,
  provideFirestore,
} from '@angular/fire/firestore';
import { memoryLocalCache } from 'firebase/firestore';
import { API_URL, WS_URL } from '@interv/util';
import { appRoutes } from './app.routes';
import { environment } from '../environments/environment';

function provideFirestoreInstance(injector: Injector) {
  const app = injector.get(FirebaseApp);
  const settings = {
    localCache: memoryLocalCache(),
    // Helps on some corporate / proxy networks where WebChannel gets stuck.
    experimentalAutoDetectLongPolling: true,
  } as const;

  try {
    return initializeFirestore(app, settings);
  } catch {
    // Hot reload / duplicate init: default instance already exists.
    return getFirestore(app);
  }
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    { provide: API_URL, useValue: environment.apiUrl },
    { provide: WS_URL, useValue: environment.wsUrl },
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth((injector: Injector) => getAuth(injector.get(FirebaseApp))),
    provideFirestore(provideFirestoreInstance),
  ],
};
