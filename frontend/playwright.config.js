import { defineConfig, devices } from '@playwright/test';

/**
 * E2E configuration.
 *
 * The global setup in `e2e/globalSetup.js` starts a throwaway mongod, the real
 * backend against it, and the Vite dev server. Nothing here touches the Atlas
 * cluster in backend/.env.
 */
export default defineConfig({
    testDir: './e2e',
    globalSetup: './e2e/globalSetup.js',
    globalTeardown: './e2e/globalTeardown.js',

    // Journeys share a browser context per file; keep them serial within a file.
    fullyParallel: false,
    workers: 1,

    timeout: 60_000,
    expect: { timeout: 15_000 },

    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],

    use: {
        // Populated by globalSetup once the dev server port is known.
        baseURL: `http://127.0.0.1:${process.env.E2E_WEB_PORT || 5199}`,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'off',
        // The app is mobile-first; test at a phone viewport by default.
        ...devices['Pixel 7'],
    },

    projects: [
        {
            name: 'mobile-chromium',
            use: { ...devices['Pixel 7'] }
        },
        {
            name: 'desktop-chromium',
            use: { ...devices['Desktop Chrome'] },
            testMatch: /admin\..*\.spec\.js/   // admin panel is a desktop UI
        }
    ]
});
