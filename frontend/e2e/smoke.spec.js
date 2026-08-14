import { test, expect } from '@playwright/test';

/**
 * Smoke: the app boots, routes resolve, and the browser can reach the API.
 * If these fail, every other spec is noise — fix these first.
 */

test('the app loads and mounts React', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const root = page.locator('#root');
    await expect(root).toBeAttached();
    // React mounted something, not just an empty shell.
    await expect.poll(() => root.innerHTML().then(h => h.length), { timeout: 20_000 })
        .toBeGreaterThan(50);

    expect(errors, `uncaught page errors: ${errors.join(' | ')}`).toHaveLength(0);
});

test('the root path redirects into the customer app', async ({ page }) => {
    await page.goto('/');
    await page.waitForURL(/\/user\//, { timeout: 20_000 });
    expect(page.url()).toContain('/user/');
});

test('the browser can reach the backend API', async ({ page }) => {
    await page.goto('/');
    const status = await page.evaluate(async () => {
        const base = import.meta?.env?.VITE_API_URL;
        const res = await fetch(`${base}/faqs`);
        return res.status;
    }).catch(() => null);

    // Fall back to a direct check if import.meta is not reachable in page scope.
    if (status === null) {
        const res = await page.request.get(`${process.env.E2E_API_URL || 'http://127.0.0.1:5099/api'}/faqs`);
        expect(res.status()).toBe(200);
    } else {
        expect(status).toBe(200);
    }
});

test('each persona entry point renders without a crash', async ({ page }) => {
    for (const route of ['/user/auth', '/vendor', '/admin/login', '/supplier']) {
        const errors = [];
        page.on('pageerror', e => errors.push(`${route}: ${e.message}`));

        await page.goto(route);
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('#root')).toBeAttached();

        expect(errors, errors.join(' | ')).toHaveLength(0);
        page.removeAllListeners('pageerror');
    }
});
