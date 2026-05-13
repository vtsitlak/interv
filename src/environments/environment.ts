import type { FirebaseOptions } from '@angular/fire/app';

export const environment = {
  production: false,
  firebaseConfig: {
    apiKey: 'AIzaSyDwBtNVQur3rSP4dO4YSrOLuHFjllzWafc',
    authDomain: 'interv-c6366.firebaseapp.com',
    projectId: 'interv-c6366',
    storageBucket: 'interv-c6366.firebasestorage.app',
    messagingSenderId: '30333030614',
    appId: '1:30333030614:web:971bafe7d5c3c3d27e7977',
  } satisfies FirebaseOptions,
  // Use 127.0.0.1 (not "localhost"): uvicorn binds 127.0.0.1 — some browsers resolve
  // localhost to IPv6 (::1) first and the WebSocket never connects.
  apiUrl: 'http://127.0.0.1:8000',
  wsUrl: 'ws://127.0.0.1:8000',
};
