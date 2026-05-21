import { Routes } from '@angular/router';
import {
  InterviewComponent,
  InterviewSummaryComponent,
} from '@interv/interview';
import {
  authGuard,
  candidateGuard,
  recruiterGuard,
  recruiterProfileCompleteGuard,
} from './core';

export const appRoutes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('@interv/home').then(m => m.HomeComponent),
  },
  {
    path: 'recruiter',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('@interv/feature-auth').then(m => m.LoginComponent),
        data: { authAudience: 'recruiter' },
      },
      {
        path: 'register',
        loadComponent: () =>
          import('@interv/feature-auth').then(m => m.RegisterComponent),
        data: { authAudience: 'recruiter' },
      },
      {
        path: 'account',
        canActivate: [authGuard, recruiterGuard],
        loadComponent: () =>
          import('@interv/account').then(m => m.AccountComponent),
      },
      {
        path: 'profile',
        canActivate: [authGuard, recruiterGuard],
        loadComponent: () =>
          import('@interv/recruiter').then(m => m.RecruiterProfileComponent),
      },
      {
        path: 'dashboard',
        canActivate: [authGuard, recruiterGuard, recruiterProfileCompleteGuard],
        loadComponent: () =>
          import('@interv/recruiter').then(m => m.RecruiterDashboardComponent),
      },
      {
        path: 'candidates',
        canActivate: [authGuard, recruiterGuard, recruiterProfileCompleteGuard],
        loadComponent: () =>
          import('@interv/recruiter').then(m => m.RecruiterCandidatesComponent),
      },
      {
        path: 'candidates/:profileId',
        canActivate: [authGuard, recruiterGuard, recruiterProfileCompleteGuard],
        loadComponent: () =>
          import('@interv/candidate-profile').then(m => m.ProfileComponent),
        data: { recruiterView: true },
      },
      {
        path: 'candidates/:profileId/interview',
        canActivate: [authGuard, recruiterGuard, recruiterProfileCompleteGuard],
        component: InterviewComponent,
        data: { skipRecruiterSetup: true },
      },
      {
        path: 'candidates/:profileId/feedback',
        canActivate: [authGuard, recruiterGuard, recruiterProfileCompleteGuard],
        loadComponent: () =>
          import('@interv/recruiter-feedback').then(m => m.FeedbackComponent),
        data: { recruiterFeedback: true },
      },
    ],
  },
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
    path: 'candidate',
    children: [
      {
        path: 'account',
        canActivate: [authGuard, candidateGuard],
        loadComponent: () =>
          import('@interv/account').then(m => m.AccountComponent),
      },
      {
        path: 'dashboard',
        canActivate: [authGuard, candidateGuard],
        loadComponent: () =>
          import('@interv/candidate-dashboard').then(m => m.DashboardComponent),
      },
      {
        path: 'train-profile',
        canActivate: [authGuard, candidateGuard],
        loadComponent: () =>
          import('@interv/candidate-profile/train').then(
            m => m.ProfileTrainComponent,
          ),
      },
      {
        path: 'my-profile',
        canActivate: [authGuard, candidateGuard],
        loadComponent: () =>
          import('@interv/candidate-profile').then(m => m.ProfileComponent),
        data: { ownerMode: true },
      },
      {
        path: 'test-interview',
        canActivate: [authGuard, candidateGuard],
        component: InterviewComponent,
        data: { testMode: true },
      },
      {
        path: ':profileId',
        loadComponent: () =>
          import('@interv/candidate-profile').then(m => m.ProfileComponent),
      },
      {
        path: ':profileId/interview/:interviewId/summary',
        component: InterviewSummaryComponent,
      },
      {
        path: ':profileId/interview',
        component: InterviewComponent,
      },
      {
        path: ':profileId/feedback',
        loadComponent: () =>
          import('@interv/recruiter-feedback').then(m => m.FeedbackComponent),
      },
    ],
  },
  { path: 'dashboard', redirectTo: 'candidate/dashboard', pathMatch: 'full' },
  { path: 'profile', redirectTo: 'candidate/train-profile', pathMatch: 'full' },
  {
    path: 'candidate/profile',
    redirectTo: 'candidate/train-profile',
    pathMatch: 'full',
  },
  { path: 'my-profile', redirectTo: 'candidate/my-profile', pathMatch: 'full' },
  {
    path: 'test-interview',
    redirectTo: 'candidate/test-interview',
    pathMatch: 'full',
  },
  { path: '**', redirectTo: '' },
];
