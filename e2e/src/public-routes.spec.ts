import { test, expect } from './test-helpers';

test.describe('Public candidate routes', () => {
  test('unknown public profile shows unavailable or error state', async ({
    page,
  }) => {
    await page.goto('/candidate/e2e-missing-profile-id');
    await expect(page.locator('body')).toContainText(
      /not available|Profile not found|unavailable|Save and train|error|Loading/i,
      { timeout: 20_000 },
    );
    await expect(page.locator('.loading-spinner')).toHaveCount(0, {
      timeout: 45_000,
    });
    await expect(page.locator('body')).toContainText(
      /not available|Profile not found|unavailable|Save and train/i,
      { timeout: 5_000 },
    );
  });

  test('public interview entry for unknown profile', async ({ page }) => {
    await page.goto('/candidate/e2e-missing-profile-id/interview');
    await expect(page.locator('body')).toContainText(
      /interview|profile|error|Starting/i,
      { timeout: 15_000 },
    );
  });

  test('public feedback route for unknown profile', async ({ page }) => {
    await page.goto('/candidate/e2e-missing-profile-id/feedback');
    await expect(page.locator('body')).toContainText(
      /feedback|profile|error|interview/i,
      { timeout: 15_000 },
    );
  });

  test('/candidate/profile resolves as a public profile id route', async ({
    page,
  }) => {
    await page.goto('/candidate/profile', { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL('/candidate/profile');
    await expect(page.locator('.loading-spinner')).toHaveCount(0, {
      timeout: 45_000,
    });
    await expect(page.locator('body')).toContainText(
      /not available|Profile not found|unavailable|Engineer|profile|Save and train/i,
      { timeout: 15_000 },
    );
  });

  test('unknown wildcard route redirects to home', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page).toHaveURL('/');
    await expect(
      page.getByRole('heading', {
        name: 'Your profile. Your AI twin. Better interviews.',
      }),
    ).toBeVisible();
  });
});
