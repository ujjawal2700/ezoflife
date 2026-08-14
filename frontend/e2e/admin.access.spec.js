import { test, expect } from '@playwright/test';

/**
 * Admin panel access control, from the browser's point of view.
 *
 * The admin routes are guarded client-side by a localStorage flag. The real
 * enforcement is server-side (`verifyAdmin`), which is covered by the backend
 * suite; these tests cover the UI gate and that the panel does not leak data
 * to an unauthenticated visitor.
 */

test('an unauthenticated visitor is sent to the admin login', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await page.waitForURL(/\/admin\/login/, { timeout: 20_000 });
    expect(page.url()).toContain('/admin/login');
});

test('every protected admin route redirects when logged out', async ({ page }) => {
    for (const route of ['/admin/orders', '/admin/users', '/admin/vendors', '/admin/payouts']) {
        await page.goto(route);
        await page.waitForURL(/\/admin\/login/, { timeout: 20_000 });
        expect(page.url(), `${route} did not redirect`).toContain('/admin/login');
    }
});

test('the admin login screen renders its form', async ({ page }) => {
    await page.goto('/admin/login');
    await expect(page.locator('#root')).toBeAttached();
    const inputs = page.locator('input:visible');
    await expect.poll(() => inputs.count(), { timeout: 20_000 }).toBeGreaterThan(0);
});

test('a forged localStorage flag does not yield real admin data', async ({ page }) => {
    // The client-side guard can be faked; the server must still refuse.
    await page.goto('/admin/login');
    await page.evaluate(() => {
        localStorage.setItem('adminAuth', 'true');
        localStorage.setItem('adminToken', 'forged.token.value');
    });

    const apiUrl = process.env.E2E_API_URL || 'http://127.0.0.1:5099/api';
    const res = await page.request.get(`${apiUrl}/admin/users`, {
        headers: { Authorization: 'Bearer forged.token.value' }
    });

    expect(res.status(), 'a forged token was accepted by the API').toBe(401);
});

test('the admin panel loads without uncaught errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');

    expect(errors, errors.join(' | ')).toHaveLength(0);
});
