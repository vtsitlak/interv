import { ApplicationConfig, type Injector } from '@angular/core';
import { provideRouter } from '@angular/router';
import { FirebaseApp, provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { API_URL, WS_URL } from '@interv/util';
import { appRoutes } from './app.routes';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(appRoutes),
    { provide: API_URL, useValue: environment.apiUrl },
    { provide: WS_URL, useValue: environment.wsUrl },
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideAuth((injector: Injector) => getAuth(injector.get(FirebaseApp))),
    provideFirestore(() => getFirestore()),
  ],
};
