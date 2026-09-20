import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  timeout: 20000,
  use: { baseURL: 'http://127.0.0.1:4173', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }, { name: 'webkit', use: { browserName: 'webkit' } }],
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    env: { VITE_SUPABASE_URL: 'https://supabase.invalid', VITE_SUPABASE_ANON_KEY: 'fixture-only', VITE_WORKER_URL: 'https://worker.invalid', VITE_USE_HARNESS_V2: 'true' },
  },
});
