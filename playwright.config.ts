import {defineConfig} from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  workers: process.env.CI ? 2 : undefined,
  use: {baseURL: 'http://127.0.0.1:4173', channel: process.env.CI ? 'chromium' : 'msedge', viewport: {width: 1440, height: 1000}, trace: 'retain-on-failure'},
  webServer: {command: 'npm run dev -- --port 4173 --strictPort', url: 'http://127.0.0.1:4173', reuseExistingServer: !process.env.CI},
  reporter: 'list',
});
