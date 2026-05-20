import { test as base, expect } from '@playwright/test';
import { signOutIfSignedIn } from './auth-helpers';

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    if (baseURL) {
      await signOutIfSignedIn(page);
    }
    await use(page);
  },
});

export { expect };
