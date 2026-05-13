import { Routes } from '@angular/router';
import { authGuard } from '@interv/util';

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('@interv/feature-auth').then(m => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('@interv/feature-auth').then(m => m.RegisterComponent),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@interv/feature-dashboard').then(m => m.FeatureDashboard),
  },
  {
    path: 'profile/edit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@interv/feature-profile-edit').then(m => m.ProfileEditComponent),
  },
  {
    path: 'p/:profileId',
    loadComponent: () =>
      import('@interv/feature-profile').then(m => m.FeatureProfile),
  },
  {
    path: 'p/:profileId/interview',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@interv/feature-interview').then(m => m.FeatureInterview),
  },
  {
    path: 'p/:profileId/feedback',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@interv/feature-feedback').then(m => m.FeatureFeedback),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
