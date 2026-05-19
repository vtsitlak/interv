import { test, expect } from './test-helpers';

test.describe('Protected route redirects (signed out)', () => {
  test('candidate app routes redirect to home', async ({ page }) => {
    for (const path of [
      '/candidate/dashboard',
      '/candidate/train-profile',
      '/candidate/my-profile',
      '/candidate/test-interview',
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL('/');
    }
  });

  test('recruiter app routes redirect to home when signed out', async ({ page }) => {
    for (const path of [
      '/recruiter/dashboard',
      '/recruiter/profile',
      '/recruiter/candidates',
      '/recruiter/candidates/e2e-missing-profile-id',
      '/recruiter/candidates/e2e-missing-profile-id/interview',
      '/recruiter/candidates/e2e-missing-profile-id/feedback',
    ]) {
      await page.goto(path);
      await expect(page).toHaveURL('/');
    }
  });

  test('legacy shortcuts redirect appropriately', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL('/');

    await page.goto('/profile');
    await expect(page).toHaveURL('/');

    await page.goto('/my-profile');
    await expect(page).toHaveURL('/');

    await page.goto('/test-interview');
    await expect(page).toHaveURL('/');
  });
});
