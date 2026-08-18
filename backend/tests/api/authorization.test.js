/**
 * Authorization on order routes.
 *
 * All order mutations are behind `verifyUser`, and identity is taken from the
 * token rather than the request body. These tests cover both halves: that a
 * token is required at all, and that holding *a* token does not let you act on
 * somebody else's order.
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
        method: 'POST', body: orderPayload(customerId), token: customerToken
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

        // Read back as Admin — an anonymous read would now be refused with 401,
        // which would mask whether the record actually went.
        const after = await api(env.baseUrl, `/api/orders/${id}`, { token: tokenFor('Admin') });
        assert.equal(after.status, 404, `order still retrievable (${after.status})`);
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

describe('order mutations require authentication', () => {
    // These were the KNOWN GAPS block. The routes are now behind verifyUser and
    // identity is taken from the token, so the assertions are inverted.

    test('order creation is refused without a token', async () => {
        const res = await api(env.baseUrl, '/api/orders', {
            method: 'POST', body: orderPayload(customerId)
        });
        assert.equal(res.status, 401);
    });

    test('status cannot be changed without a token', async () => {
        const id = await newOrder();
        const res = await api(env.baseUrl, `/api/orders/status/${id}`, {
            method: 'PATCH', body: { status: 'DELIVERED' }
        });
        assert.equal(res.status, 401);
    });

    test('cancellation is refused without a token', async () => {
        const id = await newOrder();
        const res = await api(env.baseUrl, `/api/orders/cancel/${id}`, { method: 'POST', body: {} });
        assert.equal(res.status, 401);
    });

    test('an order cannot be read without a token', async () => {
        const id = await newOrder();
        const res = await api(env.baseUrl, `/api/orders/${id}`);
        assert.equal(res.status, 401);
    });
});

describe('a customer cannot act as another customer', () => {
    test('a body-supplied customerId is ignored — the order belongs to the caller', async () => {
        const other = await createUser(api, env.baseUrl, '9990000021', 'Customer');

        // Caller is `customerToken`, but the body claims someone else placed it.
        const res = await api(env.baseUrl, '/api/orders', {
            method: 'POST',
            body: orderPayload(other.id),
            token: customerToken
        });

        assert.equal(res.status, 201);
        const owner = res.body.customer?._id || res.body.customer;
        assert.equal(
            String(owner), String(customerId),
            'the order was attributed to the id in the body rather than the token holder'
        );
    });

    test('one customer cannot read another customer\'s order', async () => {
        const id = await newOrder();                                   // owned by customerId
        const intruder = await createUser(api, env.baseUrl, '9990000022', 'Customer');

        const res = await api(env.baseUrl, `/api/orders/${id}`, { token: intruder.token });
        assert.equal(res.status, 403);
    });

    test('one customer cannot cancel another customer\'s order', async () => {
        const id = await newOrder();
        const intruder = await createUser(api, env.baseUrl, '9990000023', 'Customer');

        const res = await api(env.baseUrl, `/api/orders/cancel/${id}`, {
            method: 'POST', body: {}, token: intruder.token
        });
        assert.equal(res.status, 403);
    });

    test('an unrelated vendor cannot change an order\'s status', async () => {
        const id = await newOrder();
        const stranger = await createUser(api, env.baseUrl, '9990000024', 'Vendor');

        const res = await api(env.baseUrl, `/api/orders/status/${id}`, {
            method: 'PATCH', body: { status: 'DELIVERED' }, token: stranger.token
        });
        assert.equal(res.status, 403);
    });

    test('a customer only sees their own orders in /my', async () => {
        await newOrder();
        const intruder = await createUser(api, env.baseUrl, '9990000025', 'Customer');

        // Even asking for someone else's id, the token decides.
        const res = await api(env.baseUrl, `/api/orders/my?customerId=${customerId}`, {
            token: intruder.token
        });
        const orders = Array.isArray(res.body) ? res.body : (res.body.orders || []);
        assert.equal(orders.length, 0, 'a customer saw another customer\'s orders');
    });
});
