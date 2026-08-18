/**
 * Order creation and lifecycle.
 *
 * Covers the fields the rest of the platform depends on: identifiers, status
 * transitions, price breakdown, slot handling, and input validation.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestEnvironment, api } from '../helpers/testEnvironment.js';
import { orderPayload, createUser, tokenFor } from '../helpers/factories.js';

let env, customerId, customerToken;

before(async () => {
    env = await startTestEnvironment();
    const user = await createUser(api, env.baseUrl, '9990000003', 'Customer');
    customerId = user.id;
    customerToken = user.token;
}, { timeout: 90000 });

after(async () => { if (env) await env.stop(); });

const create = (overrides) =>
    api(env.baseUrl, '/api/orders', {
        method: 'POST', body: orderPayload(customerId, overrides), token: customerToken
    });

describe('order creation', () => {
    test('creates an order and returns an id', async () => {
        const res = await create();
        assert.equal(res.status, 201);
        assert.ok(res.body._id);
    });

    test('assigns a human-readable order number', async () => {
        const res = await create();
        assert.ok(res.body.orderId, 'orderId should be generated');
        assert.match(String(res.body.orderId), /\S/);
    });

    test('starts in ORDER_PLACED', async () => {
        const res = await create();
        assert.equal(res.body.status, 'ORDER_PLACED');
    });

    test('stores a full price breakdown', async () => {
        const res = await create();
        const b = res.body.priceBreakdown;
        assert.ok(b, 'priceBreakdown must be persisted');
        for (const key of ['baseWithArea', 'platformFee', 'logisticsFee', 'gstAmount']) {
            assert.ok(key in b, `breakdown missing ${key}`);
        }
    });

    test('records the pickup and delivery slots as sent', async () => {
        const res = await create();
        assert.equal(res.body.pickupSlot.time, '02:00 PM - 04:00 PM');
        assert.equal(res.body.deliverySlot.time, '06:00 PM - 08:00 PM');
    });

    test('computes a pickup trigger time for a valid slot', async () => {
        const res = await create();
        assert.ok(res.body.pickupTriggerTime, 'trigger time should be set');
        assert.ok(!Number.isNaN(new Date(res.body.pickupTriggerTime).valueOf()));
    });

    test('an unparseable slot no longer 500s the request', async () => {
        // Regression: this previously produced an Invalid Date and a 500.
        const res = await create({ pickupSlot: { date: '2026-09-20', time: 'Morning' } });
        assert.notEqual(res.status, 500, 'malformed slot must not crash order creation');
        assert.equal(res.status, 201);
    });

    test('applies the express surcharge when requested', async () => {
        const normal = await create({ deliveryMode: 'Normal' });
        const express = await create({ deliveryMode: 'Express' });
        assert.ok(
            express.body.totalAmount > normal.body.totalAmount,
            `express (${express.body.totalAmount}) should exceed normal (${normal.body.totalAmount})`
        );
    });
});

describe('order creation validation', () => {
    // Identity now comes from the token, so a body customerId is no longer part
    // of the contract for a normal caller — these cover what still can go wrong.

    test('a body customerId is not required — the token supplies it', async () => {
        const body = orderPayload(customerId);
        delete body.customerId;
        const res = await api(env.baseUrl, '/api/orders', { method: 'POST', body, token: customerToken });
        assert.equal(res.status, 201);
    });

    test('rejects an unknown customerId when an Admin supplies one', async () => {
        const res = await api(env.baseUrl, '/api/orders', {
            method: 'POST',
            body: orderPayload('60000000000000000000000a'),
            token: tokenFor('Admin')
        });
        assert.equal(res.status, 404);
    });

    test('does not 500 on a malformed customerId from an Admin', async () => {
        const res = await api(env.baseUrl, '/api/orders', {
            method: 'POST',
            body: orderPayload('not-an-object-id'),
            token: tokenFor('Admin')
        });
        assert.ok(res.status >= 400 && res.status < 500,
            `expected a 4xx, got ${res.status}`);
    });
});

describe('order retrieval', () => {
    test('fetches a created order by id', async () => {
        const created = await create();
        const res = await api(env.baseUrl, `/api/orders/${created.body._id}`, { token: customerToken });
        assert.equal(res.status, 200);
        assert.equal(res.body._id, created.body._id);
    });

    test('returns 404 for an id that does not exist', async () => {
        const res = await api(env.baseUrl, '/api/orders/60000000000000000000000b', { token: customerToken });
        assert.equal(res.status, 404);
    });

    test('lists the orders belonging to a customer', async () => {
        await create();
        const res = await api(env.baseUrl, '/api/orders/my', { token: customerToken });
        assert.equal(res.status, 200);
        const orders = Array.isArray(res.body) ? res.body : (res.body.orders || []);
        assert.ok(orders.length > 0, 'customer should have orders');
    });
});

describe('status transitions', () => {
    test('moves an order to a new status', async () => {
        const created = await create();
        const res = await api(env.baseUrl, `/api/orders/status/${created.body._id}`, {
            method: 'PATCH', body: { status: 'PROCESSING' }, token: customerToken
        });
        assert.ok(res.status < 400, `status update refused with ${res.status}`);

        const after = await api(env.baseUrl, `/api/orders/${created.body._id}`, { token: customerToken });
        assert.equal(after.body.status, 'PROCESSING');
    });

    test('rejects a status outside the allowed set', async () => {
        const created = await create();
        const res = await api(env.baseUrl, `/api/orders/status/${created.body._id}`, {
            method: 'PATCH', body: { status: 'TOTALLY_INVALID_STATUS' }, token: customerToken
        });
        assert.ok(res.status >= 400, `invalid status was accepted (${res.status})`);
    });

    test('admin can list all orders', async () => {
        await create();
        const res = await api(env.baseUrl, '/api/orders/all', { token: tokenFor('Admin') });
        assert.equal(res.status, 200);
    });
});
