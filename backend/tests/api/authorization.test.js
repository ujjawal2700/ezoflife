/**
 * Authorization on order routes.
 *
 * Note: several order routes are still unauthenticated by design decision
 * pending a `verifyUser` middleware. Where that is the case, the test asserts
 * the CURRENT behaviour and is marked with a TODO so the suite goes red the
 * day the route is secured — that is the signal to tighten the assertion, not
 * a passing bill of health.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestEnvironment, api } from '../helpers/testEnvironment.js';
import { orderPayload, createUser, tokenFor } from '../helpers/factories.js';

let env, customerId, customerToken;

before(async () => {
    env = await startTestEnvironment();
    const user = await createUser(api, env.baseUrl, '9990000002', 'Customer');
    customerId = user.id;
    customerToken = user.token;
}, { timeout: 90000 });

after(async () => { if (env) await env.stop(); });

const newOrder = async () => {
    const res = await api(env.baseUrl, '/api/orders', {
        method: 'POST', body: orderPayload(customerId)
    });
    assert.equal(res.status, 201, 'fixture order should be created');
    return res.body._id;
};

describe('DELETE /api/orders/:id is admin-only', () => {
    test('refuses an anonymous caller', async () => {
        const id = await newOrder();
        const res = await api(env.baseUrl, `/api/orders/${id}`, { method: 'DELETE' });
        assert.equal(res.status, 401);
    });

    test('refuses a logged-in customer', async () => {
        const id = await newOrder();
        const res = await api(env.baseUrl, `/api/orders/${id}`, {
            method: 'DELETE', token: customerToken
        });
        assert.equal(res.status, 403);
    });

    test('refuses a vendor', async () => {
        const id = await newOrder();
        const res = await api(env.baseUrl, `/api/orders/${id}`, {
            method: 'DELETE', token: tokenFor('Vendor')
        });
        assert.equal(res.status, 403);
    });

    test('refuses a garbage token', async () => {
        const id = await newOrder();
        const res = await api(env.baseUrl, `/api/orders/${id}`, {
            method: 'DELETE', token: 'not.a.jwt'
        });
        assert.equal(res.status, 401);
    });

    test('allows an admin', async () => {
        const id = await newOrder();
        const res = await api(env.baseUrl, `/api/orders/${id}`, {
            method: 'DELETE', token: tokenFor('Admin')
        });
        assert.equal(res.status, 200);
    });

    test('the order is genuinely gone after an admin delete', async () => {
        const id = await newOrder();
        await api(env.baseUrl, `/api/orders/${id}`, { method: 'DELETE', token: tokenFor('Admin') });
        const after = await api(env.baseUrl, `/api/orders/${id}`);
        assert.ok(after.status === 404 || after.body === null, `order still retrievable (${after.status})`);
    });
});

describe('admin-only route groups reject non-admins', () => {
    test('/api/admin refuses anonymous access', async () => {
        const res = await api(env.baseUrl, '/api/admin/users');
        assert.equal(res.status, 401);
    });

    test('/api/admin refuses a customer token', async () => {
        const res = await api(env.baseUrl, '/api/admin/users', { token: customerToken });
        assert.equal(res.status, 403);
    });

    test('/api/admin accepts an admin token', async () => {
        const res = await api(env.baseUrl, '/api/admin/users', { token: tokenFor('Admin') });
        assert.ok(res.status < 400, `admin was blocked with ${res.status}`);
    });
});

describe('KNOWN GAPS — these routes are still unauthenticated', () => {
    // TODO: secure with a verifyUser middleware + ownership checks.
    // When that lands, these tests will fail and must be flipped to expect 401/403.

    test('TODO(security): order creation accepts an arbitrary customerId', async () => {
        const res = await api(env.baseUrl, '/api/orders', {
            method: 'POST', body: orderPayload(customerId)
        });
        assert.equal(res.status, 201,
            'If this now fails, order creation was secured — update this test to expect 401.');
    });

    test('TODO(security): status can be changed without a token', async () => {
        const id = await newOrder();
        const res = await api(env.baseUrl, `/api/orders/status/${id}`, {
            method: 'PATCH', body: { status: 'DELIVERED' }
        });
        assert.ok(res.status < 400,
            'If this now fails, status updates were secured — update this test to expect 401.');
    });
});
