import type { FirebaseOptions } from '@angular/fire/app';

export const environment = {
  production: true,
  firebaseConfig: {
    apiKey: 'AIzaSyDwBtNVQur3rSP4dO4YSrOLuHFjllzWafc',
    authDomain: 'interv-c6366.firebaseapp.com',
    projectId: 'interv-c6366',
    storageBucket: 'interv-c6366.firebasestorage.app',
    messagingSenderId: '30333030614',
    appId: '1:30333030614:web:971bafe7d5c3c3d27e7977',
  } satisfies FirebaseOptions,
  apiUrl: 'https://your-railway-app.railway.app',
  wsUrl: 'wss://your-railway-app.railway.app',
};
