import type { FirebaseOptions } from '@angular/fire/app';

/**
 * Mirror of root app prod env (`src/environments/environment.prod.ts`).
 */
export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: 'your-api-key',
    authDomain: 'your-app.firebaseapp.com',
    projectId: 'your-project-id',
    storageBucket: 'your-app.appspot.com',
    messagingSenderId: 'your-sender-id',
    appId: 'your-app-id',
  } satisfies FirebaseOptions,
  apiUrl: 'https://your-railway-app.railway.app',
  wsUrl: 'wss://your-railway-app.railway.app',
};
