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
      import('@interv/candidate').then(m => m.DashboardComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@interv/candidate').then(m => m.ProfileComponent),
  },
  {
    path: 'p/:profileId',
    loadComponent: () =>
      import('@interv/recruiter').then(m => m.CandidateProfileComponent),
  },
  {
    path: 'p/:profileId/interview',
    loadComponent: () =>
      import('@interv/recruiter').then(m => m.InterviewComponent),
  },
  {
    path: 'p/:profileId/feedback',
    loadComponent: () =>
      import('@interv/recruiter').then(m => m.FeedbackComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
