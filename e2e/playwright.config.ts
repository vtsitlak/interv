import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const baseURL = process.env['BASE_URL'] || 'http://localhost:4200';

const browserDevices = process.env['CI']
  ? [{ name: 'chromium', device: devices['Desktop Chrome'] }]
  : [
      { name: 'chromium', device: devices['Desktop Chrome'] },
      { name: 'firefox', device: devices['Desktop Firefox'] },
      { name: 'webkit', device: devices['Desktop Safari'] },
    ];

/** Public/signed-out specs run before authenticated specs to avoid Firebase session bleed. */
function buildProjects(): PlaywrightTestConfig['projects'] {
  return browserDevices.flatMap(({ name, device }) => {
    const publicName = `${name}-public`;
    const authName = `${name}-auth`;
    return [
      {
        name: publicName,
        use: { ...device },
        testMatch: /public-|auth-redirects/,
        fullyParallel: false,
      },
      {
        name: authName,
        use: { ...device },
        testMatch: /authenticated-/,
        dependencies: [publicName],
        fullyParallel: false,
      },
    ];
  });
}

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  timeout: 90_000,
  expect: { timeout: 15_000 },
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 2 : 1,
  use: {
    baseURL,
    navigationTimeout: 60_000,
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npx nx run interv:serve',
      url: 'http://localhost:4200',
      reuseExistingServer: !process.env['CI'],
      cwd: workspaceRoot,
    },
    {
      command:
        process.platform === 'win32'
          ? 'venv\\Scripts\\uvicorn main:app --host 127.0.0.1 --port 8000'
          : 'venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000',
      url: 'http://127.0.0.1:8000/health',
      reuseExistingServer: !process.env['CI'],
      cwd: `${workspaceRoot}/backend`,
      timeout: 60_000,
    },
  ],
  projects: buildProjects(),
});
