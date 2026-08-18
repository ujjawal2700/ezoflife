/**
 * Promotion authorization.
 *
 * Discount codes are a direct revenue path — creating, editing or approving one
 * changes what customers pay. Every route here was previously callable with no
 * token at all, so these cover both halves: a token is required, and holding
 * *a* token does not let you touch somebody else's promotion.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestEnvironment, api } from '../helpers/testEnvironment.js';
import { createUser, tokenFor } from '../helpers/factories.js';

let env, vendorA, vendorB;

before(async () => {
    env = await startTestEnvironment();
    vendorA = await createUser(api, env.baseUrl, '9990000031', 'Vendor');
    vendorB = await createUser(api, env.baseUrl, '9990000032', 'Vendor');
    assert.ok(vendorA.token && vendorB.token, 'vendor fixtures should exist');
}, { timeout: 90000 });

after(async () => { if (env) await env.stop(); });

const DAY = 24 * 60 * 60 * 1000;

/**
 * The app allows a vendor only ONE promotion per date range, so each fixture
 * gets its own non-overlapping window — otherwise the second create is
 * rejected by that business rule and the auth assertion never runs.
 */
let windowSlot = 0;
const promoBody = (overrides = {}) => {
    const slot = windowSlot++;
    const start = Date.now() + (slot * 40 * DAY);
    return {
        title: `Test Promo ${slot}`,
        code: `TEST${Date.now()}${Math.floor(Math.random() * 1000)}`,
        owner_type: 'VENDOR',
        discountType: 'Flat',
        discountValue: 50,
        minOrderValue: 100,
        usageLimit: 10,
        start_date: new Date(start).toISOString(),
        expiryDate: new Date(start + 30 * DAY).toISOString(),
        ...overrides
    };
};

/** Create a promotion owned by the given vendor. */
const createFor = async (session, overrides = {}) => {
    const res = await api(env.baseUrl, '/api/promotions', {
        method: 'POST', body: promoBody(overrides), token: session.token
    });
    assert.equal(res.status, 201, `promo fixture failed: ${JSON.stringify(res.body).slice(0, 200)}`);
    return res.body;
};

describe('promotion routes require authentication', () => {
    for (const [label, path, method] of [
        ['create', '/api/promotions', 'POST'],
        ['validate a code', '/api/promotions/validate', 'POST'],
        ['approve', '/api/promotions/admin/60000000000000000000000b/approve', 'PATCH'],
        ['reject', '/api/promotions/admin/60000000000000000000000b/reject', 'PATCH']
    ]) {
        test(`${label} is refused without a token`, async () => {
            const res = await api(env.baseUrl, path, { method, body: {} });
            assert.equal(res.status, 401);
        });
    }
});

describe('a vendor cannot touch another vendor\'s promotion', () => {
    test('the owner is taken from the token, not the body', async () => {
        // vendorA creates, but claims the promotion belongs to vendorB.
        const promo = await createFor(vendorA, { vendorId: vendorB.id });
        assert.equal(
            String(promo.vendorId), String(vendorA.id),
            'a body-supplied vendorId overrode the token holder'
        );
    });

    test('cannot toggle', async () => {
        const promo = await createFor(vendorA);
        const res = await api(env.baseUrl, `/api/promotions/${promo._id}/toggle`, {
            method: 'PATCH', body: {}, token: vendorB.token
        });
        assert.equal(res.status, 403);
    });

    test('cannot delete', async () => {
        const promo = await createFor(vendorA);
        const res = await api(env.baseUrl, `/api/promotions/${promo._id}`, {
            method: 'DELETE', token: vendorB.token
        });
        assert.equal(res.status, 403);
    });

    test('cannot edit', async () => {
        const promo = await createFor(vendorA);
        const res = await api(env.baseUrl, `/api/promotions/${promo._id}`, {
            method: 'PUT', body: { discountValue: 9999 }, token: vendorB.token
        });
        assert.equal(res.status, 403);
    });

    test('the owner still can', async () => {
        const promo = await createFor(vendorA);
        const res = await api(env.baseUrl, `/api/promotions/${promo._id}/toggle`, {
            method: 'PATCH', body: {}, token: vendorA.token
        });
        assert.ok(res.status < 400, `owner was blocked with ${res.status}`);
    });

    test('a vendor only lists their own promotions', async () => {
        await createFor(vendorA);
        const res = await api(env.baseUrl, `/api/promotions/vendor?vendorId=${vendorA.id}`, {
            token: vendorB.token
        });
        const list = Array.isArray(res.body) ? res.body : (res.body.promotions || []);
        assert.equal(list.length, 0, 'a vendor saw another vendor\'s promotions');
    });
});

describe('platform promotions are admin-only', () => {
    test('a vendor cannot self-declare a PLATFORM promotion', async () => {
        // PLATFORM promos are auto-approved and paid for by the platform.
        const res = await api(env.baseUrl, '/api/promotions', {
            method: 'POST',
            body: promoBody({ owner_type: 'PLATFORM' }),
            token: vendorA.token
        });
        assert.equal(res.status, 403);
    });

    test('an admin can', async () => {
        const res = await api(env.baseUrl, '/api/promotions', {
            method: 'POST',
            body: promoBody({ owner_type: 'PLATFORM' }),
            token: tokenFor('Admin')
        });
        assert.equal(res.status, 201);
        assert.equal(res.body.approval_status, 'APPROVED');
    });

    test('a vendor cannot approve their own promotion', async () => {
        const promo = await createFor(vendorA);
        const res = await api(env.baseUrl, `/api/promotions/admin/${promo._id}/approve`, {
            method: 'PATCH', body: {}, token: vendorA.token
        });
        assert.equal(res.status, 403);
    });
});
