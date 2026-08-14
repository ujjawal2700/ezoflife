import { test, expect } from '@playwright/test';

/**
 * Customer authentication journey: auth screen → phone → OTP → into the app.
 *
 * Uses the development OTP (123456). When a real SMS gateway is wired up, only
 * the `fillOtp` helper below should need changing.
 */

const uniquePhone = () => `9${String(Date.now()).slice(-9)}`;

const API_URL = process.env.E2E_API_URL || 'http://127.0.0.1:5099/api';

/**
 * Create the account via the API before driving the UI.
 * The Login tab rejects unregistered numbers, and the Signup tab has extra
 * required fields that are covered by their own spec.
 */
const registerCustomer = async (page, phone) => {
    const res = await page.request.post(`${API_URL}/auth/request-otp`, {
        data: { phone, role: 'Customer', channel: 'SMS' }
    });
    expect(res.status()).toBe(200);
};

/** OTP is rendered as separate single-character boxes. */
const fillOtp = async (page, code = '123456') => {
    const boxes = page.locator('input[maxlength="1"]');
    const count = await boxes.count();
    if (count >= code.length) {
        for (let i = 0; i < code.length; i++) {
            await boxes.nth(i).fill(code[i]);
        }
    } else {
        // Fallback for a single combined input.
        await page.locator('input[type="text"], input[type="tel"]').first().fill(code);
    }
};

test('the auth screen renders a phone input', async ({ page }) => {
    await page.goto('/user/auth');
    const phone = page.locator('input[type="tel"]').first();
    await expect(phone).toBeVisible({ timeout: 20_000 });
    await expect(phone).toHaveAttribute('maxlength', '10');
});

test('the phone field accepts exactly 10 digits', async ({ page }) => {
    await page.goto('/user/auth');
    const phone = page.locator('input[type="tel"]').first();
    await phone.fill('98765432109999');
    expect((await phone.inputValue()).length).toBeLessThanOrEqual(10);
});

test('entering 10 digits auto-requests an OTP and advances to verification', async ({ page }) => {
    // The Login tab submits automatically once the number is valid — there is
    // no submit button, so do not click anything after filling.
    const phone = uniquePhone();
    await registerCustomer(page, phone);

    await page.goto('/user/auth');
    await page.locator('input[type="tel"]').first().fill(phone);

    await page.waitForURL(/\/user\/otp/, { timeout: 25_000 });
    expect(page.url()).toContain('/user/otp');
});

test('a full login lands the customer inside the app', async ({ page }) => {
    const phone = uniquePhone();
    await registerCustomer(page, phone);

    await page.goto('/user/auth');
    await page.locator('input[type="tel"]').first().fill(phone);
    await page.waitForURL(/\/user\/otp/, { timeout: 25_000 });

    await fillOtp(page);

    // Land anywhere past the auth wall.
    await page.waitForURL(
        url => !/\/user\/(auth|otp)/.test(url.pathname),
        { timeout: 30_000 }
    );

    expect(page.url()).not.toMatch(/\/user\/(auth|otp)/);
});

test('no uncaught errors during the auth flow', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));

    await page.goto('/user/auth');
    await page.locator('input[type="tel"]').first().fill(uniquePhone());
    await page.waitForTimeout(1000);

    expect(errors, errors.join(' | ')).toHaveLength(0);
});
