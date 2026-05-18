import type { UserRole } from './account.service';

export type AuthAudience = UserRole;

export type AuthFlowMode = 'login' | 'register';

export interface AuthAudienceCopy {
  loginTitle: string;
  loginSubtitle: string;
  registerTitle: string;
  registerSubtitle: string;
  signInLabel: string;
  createAccountLabel: string;
  loginPath: string;
  registerPath: string;
  alternatePrompt: string;
  alternateLink: string;
  wrongAccountMessage: string;
  btnClass: string;
  linkClass: string;
}

export const AUTH_AUDIENCE_COPY: Record<AuthAudience, AuthAudienceCopy> = {
  candidate: {
    loginTitle: 'Welcome to Interv',
    loginSubtitle: 'Sign in to manage your AI profile and interviews.',
    registerTitle: 'Create your Interv profile',
    registerSubtitle: 'Build your AI twin and share it with recruiters.',
    signInLabel: 'Sign in',
    createAccountLabel: 'Create account',
    loginPath: '/login',
    registerPath: '/register',
    alternatePrompt: "Don't have an account?",
    alternateLink: 'Sign up',
    wrongAccountMessage:
      'This account is registered as a recruiter. Use recruiter sign in or create a candidate account with a different email.',
    btnClass: 'btn-primary',
    linkClass: 'link-primary',
  },
  recruiter: {
    loginTitle: 'Recruiter sign in',
    loginSubtitle: 'Access your dashboard and search candidates.',
    registerTitle: 'Recruiter registration',
    registerSubtitle: 'Create your account, then complete your recruiter profile.',
    signInLabel: 'Sign in',
    createAccountLabel: 'Create recruiter account',
    loginPath: '/recruiter/login',
    registerPath: '/recruiter/register',
    alternatePrompt: 'New recruiter?',
    alternateLink: 'Create account',
    wrongAccountMessage:
      'This account is not a recruiter. Sign in as a candidate or register with a recruiter account.',
    btnClass: 'btn-secondary',
    linkClass: 'link-secondary',
  },
};

export const PENDING_AUTH_STORAGE_KEY = 'interv_pending_auth';

export interface PendingAuthContext {
  audience: AuthAudience;
  mode: AuthFlowMode;
}
