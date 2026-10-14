import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir: './tests/pages',
  use: {baseURL: 'http://127.0.0.1:4176/eina-castellar/', channel: 'msedge'},
  webServer: {
    command: 'node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4176 --strictPort --base /eina-castellar/',
    url: 'http://127.0.0.1:4176/eina-castellar/',
    reuseExistingServer: false,
  },
  reporter: 'list',
});
