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
      import('@interv/candidate-dashboard').then(m => m.DashboardComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@interv/candidate-profile/train').then(m => m.ProfileTrainComponent),
  },
  {
    path: 'my-profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@interv/candidate-profile').then(m => m.ProfileComponent),
    data: { ownerMode: true },
  },
  {
    path: 'test-interview',
    canActivate: [authGuard],
    loadComponent: () =>
      import('@interv/interview').then(m => m.InterviewComponent),
    data: { testMode: true },
  },
  {
    path: 'candidate/:profileId',
    loadComponent: () =>
      import('@interv/candidate-profile').then(m => m.ProfileComponent),
  },
  {
    path: 'candidate/:profileId/interview/:interviewId/summary',
    loadComponent: () =>
      import('@interv/interview').then(
        (m) => m.InterviewSummaryComponent,
      ),
  },
  {
    path: 'candidate/:profileId/interview',
    loadComponent: () =>
      import('@interv/interview').then(m => m.InterviewComponent),
  },
  {
    path: 'candidate/:profileId/feedback',
    loadComponent: () =>
      import('@interv/recruiter-feedback').then(m => m.FeedbackComponent),
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
