import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

if (typeof globalThis.fetch === 'undefined') {
  globalThis.fetch = jest.fn() as typeof fetch;
}

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
