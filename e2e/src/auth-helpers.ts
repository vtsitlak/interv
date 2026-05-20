import { expect, type Page } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

loadE2eEnv();

const E2E_CANDIDATE_EMAIL = process.env['E2E_CANDIDATE_EMAIL'];
const E2E_CANDIDATE_PASSWORD = process.env['E2E_CANDIDATE_PASSWORD'];
const E2E_RECRUITER_EMAIL = process.env['E2E_RECRUITER_EMAIL'];
const E2E_RECRUITER_PASSWORD = process.env['E2E_RECRUITER_PASSWORD'];

const FIREBASE_IDB_NAMES = [
  'firebaseLocalStorageDb',
  'firebase-heartbeat-database',
  'firebase-installations-database',
];

function loadE2eEnv(): void {
  const envPath = join(__dirname, '../.env');
  if (!existsSync(envPath)) {
    return;
  }
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

export function requireCandidateAuthEnv(): void {
  if (!E2E_CANDIDATE_EMAIL || !E2E_CANDIDATE_PASSWORD) {
    throw new Error(
      'Missing E2E_CANDIDATE_EMAIL or E2E_CANDIDATE_PASSWORD. ' +
        'Set them in e2e/.env locally or as GitHub Actions secrets.',
    );
  }
}

export function requireRecruiterAuthEnv(): void {
  if (!E2E_RECRUITER_EMAIL || !E2E_RECRUITER_PASSWORD) {
    throw new Error(
      'Missing E2E_RECRUITER_EMAIL or E2E_RECRUITER_PASSWORD. ' +
        'Set them in e2e/.env locally or as GitHub Actions secrets.',
    );
  }
}

/** Visible when signed out (home marketing page). */
export async function expectSignedOutHome(page: Page): Promise<void> {
  await expect(
    page.getByRole('link', { name: 'Candidate sign in' }),
  ).toBeVisible({ timeout: 20_000 });
}

/**
 * Firebase Auth persists in IndexedDB; clearing storage alone is not enough.
 * Signs out via UI when possible, then wipes browser storage for this origin.
 */
export async function signOutIfSignedIn(page: Page): Promise<void> {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const logout = page.getByRole('button', { name: 'Logout' });
  if (await logout.isVisible().catch(() => false)) {
    await logout.click();
    await expect(logout).toBeHidden({ timeout: 20_000 });
  }

  await page.context().clearCookies();
  await page.evaluate(async (dbNames: string[]) => {
    localStorage.clear();
    sessionStorage.clear();
    if (!('indexedDB' in globalThis)) {
      return;
    }
    for (const name of dbNames) {
      await new Promise<void>((resolve) => {
        const request = indexedDB.deleteDatabase(name);
        request.onerror = () => resolve();
        request.onblocked = () => resolve();
        request.onsuccess = () => resolve();
      });
    }
  }, FIREBASE_IDB_NAMES);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectSignedOutHome(page);
}

/** Header shows Logout when Firebase + AuthStore are ready for guards. */
export async function waitForAuthShell(page: Page): Promise<void> {
  await expect
    .poll(
      async () => page.getByRole('button', { name: 'Logout' }).isVisible(),
      { timeout: 45_000 },
    )
    .toBe(true);
}

async function assertLoginSucceeded(
  page: Page,
  audience: 'candidate' | 'recruiter',
): Promise<void> {
  const errorAlert = page.locator('.alert-error');
  if (await errorAlert.isVisible().catch(() => false)) {
    const message = (await errorAlert.textContent())?.trim() || 'Unknown auth error';
    throw new Error(
      `Sign-in failed for ${audience}: ${message}. ` +
        (audience === 'recruiter'
          ? 'Use a user registered at /recruiter/register.'
          : 'Use a user registered at /register.'),
    );
  }

  await expect(page).toHaveURL(
    audience === 'recruiter' ? /\/recruiter\// : /\/candidate\//,
    { timeout: 45_000 },
  );
  await waitForAuthShell(page);
}

async function fillLoginForm(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Navigate to a protected route and wait until guards accept the session. */
export async function gotoAuthenticated(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(
    new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    { timeout: 30_000 },
  );
  await waitForAuthShell(page);
}

/** Visit a protected URL and expect redirect to home when signed out. */
export async function expectProtectedRouteRedirectsHome(
  page: Page,
  path: string,
): Promise<void> {
  await page.goto(path, { waitUntil: 'load' });
  await expect
    .poll(
      async () => {
        const pathname = new URL(page.url()).pathname;
        if (pathname === '/' || pathname === '') {
          return true;
        }
        return page
          .getByRole('link', { name: 'Candidate sign in' })
          .isVisible()
          .catch(() => false);
      },
      { timeout: 35_000 },
    )
    .toBe(true);
  await expectSignedOutHome(page);
}

/** Signs in as a candidate and waits until the app shell is authenticated. */
export async function loginAsCandidate(page: Page): Promise<void> {
  requireCandidateAuthEnv();
  await page.goto('/login', { waitUntil: 'domcontentloaded' });
  await fillLoginForm(
    page,
    E2E_CANDIDATE_EMAIL!,
    E2E_CANDIDATE_PASSWORD!,
  );
  await assertLoginSucceeded(page, 'candidate');
}

/** Signs in as a recruiter and waits until the app shell is authenticated. */
export async function loginAsRecruiter(page: Page): Promise<void> {
  requireRecruiterAuthEnv();
  await page.goto('/recruiter/login', { waitUntil: 'domcontentloaded' });
  await fillLoginForm(
    page,
    E2E_RECRUITER_EMAIL!,
    E2E_RECRUITER_PASSWORD!,
  );
  await assertLoginSucceeded(page, 'recruiter');
}
