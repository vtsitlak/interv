import { test, expect } from './test-helpers';
import {
  gotoAuthenticated,
  loginAsRecruiter,
  requireRecruiterAuthEnv,
  waitForAuthShell,
} from './auth-helpers';

test.describe('Authenticated recruiter pages', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    requireRecruiterAuthEnv();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsRecruiter(page);
  });

  test('dashboard or profile setup', async ({ page }) => {
    await page.goto('/recruiter/dashboard', { waitUntil: 'load' });
    await expect(page).toHaveURL(/\/recruiter\/(dashboard|profile)/, {
      timeout: 45_000,
    });
    await waitForAuthShell(page);
    const onDashboard = page.getByRole('heading', { name: 'Recruiter dashboard' });
    const onProfile = page.getByRole('heading', {
      name: 'Your recruiter profile',
    });
    await expect(onDashboard.or(onProfile)).toBeVisible({ timeout: 30_000 });
  });

  test('candidates', async ({ page }) => {
    await gotoAuthenticated(page, '/recruiter/candidates');
    await expect(page).toHaveURL(/\/recruiter\/(candidates|profile)/, {
      timeout: 45_000,
    });
    const candidates = page.getByRole('heading', { name: 'Find candidates' });
    const profile = page.getByRole('heading', { name: 'Your recruiter profile' });
    await expect(candidates.or(profile)).toBeVisible({ timeout: 30_000 });
  });

  test('recruiter profile', async ({ page }) => {
    await gotoAuthenticated(page, '/recruiter/profile');
    await expect(
      page.getByRole('heading', { name: 'Your recruiter profile' }),
    ).toBeVisible({ timeout: 30_000 });
  });

  test('account', async ({ page }) => {
    await gotoAuthenticated(page, '/recruiter/account');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Account' }),
    ).toBeVisible();
  });
});
