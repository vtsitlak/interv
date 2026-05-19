import { test, expect } from './test-helpers';

test.describe('Public pages', () => {
  test('home', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', {
        name: 'Your profile. Your AI twin. Better interviews.',
      }),
    ).toBeVisible();
    await expect(page.getByText('AI-powered interviews')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Candidate sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Recruiter sign in' })).toBeVisible();
  });

  test('candidate login', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.getByRole('heading', { name: 'Welcome to Interv' }),
    ).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });

  test('candidate register', async ({ page }) => {
    await page.goto('/register');
    await expect(
      page.getByRole('heading', { name: 'Create your Interv profile' }),
    ).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('recruiter login', async ({ page }) => {
    await page.goto('/recruiter/login');
    await expect(
      page.getByRole('heading', { name: 'Recruiter sign in' }),
    ).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
  });

  test('recruiter register', async ({ page }) => {
    await page.goto('/recruiter/register');
    await expect(
      page.getByRole('heading', { name: 'Recruiter registration' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Create recruiter account' }),
    ).toBeVisible();
  });
});
