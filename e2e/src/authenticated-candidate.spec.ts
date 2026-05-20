import { test, expect } from './test-helpers';
import {
  gotoAuthenticated,
  loginAsCandidate,
  requireCandidateAuthEnv,
} from './auth-helpers';

test.describe('Authenticated candidate pages', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeAll(() => {
    requireCandidateAuthEnv();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsCandidate(page);
  });

  test('dashboard', async ({ page }) => {
    await gotoAuthenticated(page, '/candidate/dashboard');
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('train profile', async ({ page }) => {
    await gotoAuthenticated(page, '/candidate/train-profile');
    await expect(
      page.getByRole('heading', { name: 'Train your profile' }),
    ).toBeVisible();
  });

  test('my profile', async ({ page }) => {
    await gotoAuthenticated(page, '/candidate/my-profile');
    await expect(page.locator('body')).toContainText(/profile|twin|train/i);
  });

  test('account', async ({ page }) => {
    await gotoAuthenticated(page, '/candidate/account');
    await expect(
      page.getByRole('heading', { level: 1, name: 'Account' }),
    ).toBeVisible();
  });
});
