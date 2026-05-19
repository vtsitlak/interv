import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    if (baseURL) {
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    }
    await use(page);
  },
});

export { expect };
