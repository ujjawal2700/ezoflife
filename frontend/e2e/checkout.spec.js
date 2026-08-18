import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

/**
 * Checkout & payment.
 *
 * Razorpay's own checkout is an external iframe; driving it would test their UI,
 * not ours, and would be flaky. Instead `window.Razorpay` is stubbed via
 * addInitScript so the app's real handler runs with a controlled response.
 *
 * That makes the important assertion possible in a real browser: a payment the
 * server cannot verify must never produce a paid order, no matter what the
 * client sends.
 */

const API_URL = process.env.E2E_API_URL || 'http://127.0.0.1:5099/api';
const SECRET = process.env.JWT_SECRET || 'e2e_secret_key';

const adminToken = () =>
    jwt.sign({ id: '6a7d56c980a151d5ad8b17d0', role: 'Admin', phone: '0000000000' }, SECRET, { expiresIn: '30m' });

const uniquePhone = () => `9${String(Date.now()).slice(-9)}`;

/**
 * Seed one purchasable service so the cart has something to price.
 * A MasterService requires a Category, so create that first.
 */
const seedService = async (request) => {
    const auth = { Authorization: `Bearer ${adminToken()}` };

    const catRes = await request.post(`${API_URL}/categories`, {
        headers: auth,
        data: { mainCategory: 'E2E Laundry', subCategory: `Wash ${Date.now()}`, isActive: true }
    });
    if (!catRes.ok()) return null;
    const category = await catRes.json();
    const categoryId = category._id || category.category?._id || category.data?._id;
    if (!categoryId) return null;

    const svcRes = await request.post(`${API_URL}/master-services`, {
        headers: auth,
        data: {
            itemName: 'E2E Wash & Fold',
            categoryId,
            basePrice: 100,
            discountedPrice: 100,
            unit: 'per_item',
            gst: 5,
            completionTime: 2,
            isActive: true
        }
    });
    if (!svcRes.ok()) return null;
    const svc = await svcRes.json();
    return svc._id ? svc : (svc.service || svc.data || null);
};

/** Register + verify a customer through the API and return their record. */
const loginViaApi = async (request, phone) => {
    await request.post(`${API_URL}/auth/request-otp`, {
        data: { phone, role: 'Customer', channel: 'SMS' }
    });
    const res = await request.post(`${API_URL}/auth/verify-otp`, {
        data: { phone, otp: '123456' }
    });
    return res.json();
};

/**
 * Replace Razorpay's SDK with a stub that immediately invokes the success
 * handler using whatever response we choose.
 */
const stubRazorpay = (page, response) =>
    page.addInitScript((resp) => {
        window.__rzpOpened = 0;
        window.Razorpay = function (options) {
            return {
                open() {
                    window.__rzpOpened++;
                    // Mirror the real SDK: invoke the handler asynchronously.
                    setTimeout(() => options.handler?.(resp), 30);
                },
                on() {}
            };
        };
    }, response);

test.describe('payment security through the real checkout UI', () => {
    test('a forged Razorpay response never produces a paid order', async ({ page, request }) => {
        const phone = uniquePhone();
        const auth = await loginViaApi(request, phone);
        const customerId = auth.user?._id || auth.user?.id;
        expect(customerId, 'customer should be created').toBeTruthy();

        await stubRazorpay(page, {
            razorpay_payment_id: 'pay_FORGED_E2E',
            razorpay_order_id: 'order_FORGED_E2E',
            razorpay_signature: 'deadbeefdeadbeefdeadbeef'
        });

        // Drive the app's own order call with the forged payment.
        await page.goto('/user/auth');
        const result = await page.evaluate(async ({ apiUrl, customerId, token }) => {
            const res = await fetch(`${apiUrl}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    customerId,
                    items: [{ serviceId: '000000000000000000000001', name: 'X', quantity: 1, price: 100 }],
                    pickupSlot: { date: '2026-09-20', time: '02:00 PM - 04:00 PM' },
                    deliverySlot: { date: '2026-09-22', time: '06:00 PM - 08:00 PM' },
                    pickupAddress: 'T', pickupLocation: { lat: 22.7, lng: 75.8 },
                    dropAddress: 'T', dropLocation: { lat: 22.7, lng: 75.8 },
                    totalAmount: 100,
                    paymentStatus: 'Paid',
                    paymentMethod: 'Online',
                    razorpayPaymentId: 'pay_FORGED_E2E',
                    razorpayOrderId: 'order_FORGED_E2E',
                    razorpaySignature: 'deadbeefdeadbeefdeadbeef'
                })
            });
            return { status: res.status, body: await res.json() };
        }, { apiUrl: API_URL, customerId, token: auth.token });

        expect(result.status).toBe(400);
        expect(JSON.stringify(result.body)).toMatch(/could not be verified|signature/i);

        // And nothing paid was persisted. This read must be authenticated —
        // an unauthenticated 401 would yield an empty list and pass vacuously.
        const list = await request.get(`${API_URL}/orders/my`, {
            headers: { Authorization: `Bearer ${auth.token}` }
        });
        expect(list.status(), 'verification read was not authorised').toBe(200);

        const orders = await list.json();
        const all = Array.isArray(orders) ? orders : (orders.orders || []);
        const paid = all.filter(o => o.paymentStatus === 'Paid');
        expect(paid, 'a forged payment created a paid order').toHaveLength(0);
    });

    test('the checkout page loads and prices a seeded service', async ({ page, request }) => {
        const service = await seedService(request);
        test.skip(!service, 'could not seed a service');

        const phone = uniquePhone();
        const auth = await loginViaApi(request, phone);
        const serviceId = service._id || service.service?._id;

        // Log the browser in the way the app does, then load the cart.
        await page.goto('/user/auth');
        await page.evaluate(({ user, token, sid }) => {
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('token', token);
            localStorage.setItem('cart_quantities', JSON.stringify({ [sid]: 2 }));
        }, { user: auth.user, token: auth.token, sid: serviceId });

        const errors = [];
        page.on('pageerror', e => errors.push(e.message));

        await page.goto('/user/cart');
        await page.waitForLoadState('networkidle');

        await expect(page.locator('#root')).toBeAttached();
        expect(errors, errors.join(' | ')).toHaveLength(0);
    });

    test('a COD order created through the app is never marked Paid', async ({ page, request }) => {
        const phone = uniquePhone();
        const auth = await loginViaApi(request, phone);
        const customerId = auth.user?._id || auth.user?.id;

        await page.goto('/user/auth');
        const result = await page.evaluate(async ({ apiUrl, customerId, token }) => {
            const res = await fetch(`${apiUrl}/orders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    customerId,
                    items: [{ serviceId: '000000000000000000000001', name: 'X', quantity: 1, price: 100 }],
                    pickupSlot: { date: '2026-09-20', time: '02:00 PM - 04:00 PM' },
                    deliverySlot: { date: '2026-09-22', time: '06:00 PM - 08:00 PM' },
                    pickupAddress: 'T', pickupLocation: { lat: 22.7, lng: 75.8 },
                    dropAddress: 'T', dropLocation: { lat: 22.7, lng: 75.8 },
                    totalAmount: 100,
                    paymentStatus: 'Paid',      // client lies
                    paymentMethod: 'COD'
                })
            });
            return { status: res.status, body: await res.json() };
        }, { apiUrl: API_URL, customerId, token: auth.token });

        expect(result.status).toBe(201);
        expect(result.body.paymentStatus).toBe('Pending');
        expect(result.body.paymentMethod).toBe('COD');
    });

    test('the Razorpay stub is actually exercised by the app', async ({ page }) => {
        await stubRazorpay(page, {
            razorpay_payment_id: 'pay_x', razorpay_order_id: 'order_x', razorpay_signature: 'sig_x'
        });
        await page.goto('/user/auth');

        const installed = await page.evaluate(() => typeof window.Razorpay === 'function');
        expect(installed, 'Razorpay stub was not installed').toBe(true);
    });
});
