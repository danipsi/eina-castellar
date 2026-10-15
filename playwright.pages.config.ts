import {defineConfig} from '@playwright/test';

const basePath = process.env.PAGES_BASE ?? '/eina-castellar/';
if (!/^\/(?:[A-Za-z0-9._-]+\/)*$/.test(basePath)) throw new Error('Base de Pages invàlida');

export default defineConfig({
  testDir: './tests/pages',
  forbidOnly: !!process.env.CI,
  use: {baseURL: `http://127.0.0.1:4176${basePath}`, channel: process.env.CI ? 'chromium' : 'msedge'},
  webServer: {
    command: `node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4176 --strictPort --base ${basePath}`,
    url: `http://127.0.0.1:4176${basePath}`,
    reuseExistingServer: false,
  },
  reporter: 'list',
});
