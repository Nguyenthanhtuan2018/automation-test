import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests-gen',
  reporter: [
    ['list'], 
    ['html', { open: 'never' }]
  ],
  use: {
    headless: true,
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
});
