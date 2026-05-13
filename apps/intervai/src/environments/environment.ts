import type { FirebaseOptions } from '@angular/fire/app';

/**
 * Mirror of root app env (`src/environments/environment.ts`).
 * The Nx app `interv` compiles `src/`; edit both or consolidate when moving the app under `apps/intervai`.
 */
export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: 'your-api-key',
    authDomain: 'your-app.firebaseapp.com',
    projectId: 'your-project-id',
    storageBucket: 'your-app.appspot.com',
    messagingSenderId: 'your-sender-id',
    appId: 'your-app-id',
  } satisfies FirebaseOptions,
  apiUrl: 'http://127.0.0.1:8000',
  wsUrl: 'ws://127.0.0.1:8000',
};
