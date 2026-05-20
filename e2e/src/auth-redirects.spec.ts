import { test } from './test-helpers';
import { expectProtectedRouteRedirectsHome } from './auth-helpers';

test.describe('Protected route redirects (signed out)', () => {
  test.describe.configure({ mode: 'serial' });

  test('candidate app routes redirect to home', async ({ page }) => {
    for (const path of [
      '/candidate/dashboard',
      '/candidate/train-profile',
      '/candidate/my-profile',
      '/candidate/test-interview',
      '/candidate/account',
    ]) {
      await expectProtectedRouteRedirectsHome(page, path);
    }
  });

  test('recruiter app routes redirect to home when signed out', async ({ page }) => {
    for (const path of [
      '/recruiter/dashboard',
      '/recruiter/profile',
      '/recruiter/candidates',
      '/recruiter/account',
      '/recruiter/candidates/e2e-missing-profile-id',
      '/recruiter/candidates/e2e-missing-profile-id/interview',
      '/recruiter/candidates/e2e-missing-profile-id/feedback',
    ]) {
      await expectProtectedRouteRedirectsHome(page, path);
    }
  });

  test('legacy shortcuts redirect to home', async ({ page }) => {
    for (const path of ['/dashboard', '/profile', '/my-profile', '/test-interview']) {
      await expectProtectedRouteRedirectsHome(page, path);
    }
  });
});
