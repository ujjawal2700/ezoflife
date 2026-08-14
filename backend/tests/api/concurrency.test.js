/**
 * Concurrency regression tests.
 *
 * Order numbers were previously drawn from Math.random() over a 9000-value
 * space against a unique index. Collisions began almost immediately and
 * surfaced to customers as "Error creating order" (HTTP 500). Under 15
 * concurrent writers roughly a third of all orders failed.
 *
 * These tests fail loudly if identifier generation ever regresses to a
 * non-atomic scheme.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestEnvironment, api } from '../helpers/testEnvironment.js';
import { orderPayload, createUser } from '../helpers/factories.js';

let env, customerId;

before(async () => {
    env = await startTestEnvironment();
    const user = await createUser(api, env.baseUrl, '9990000004', 'Customer');
    customerId = user.id;
}, { timeout: 90000 });

after(async () => { if (env) await env.stop(); });

const createMany = async (n) => {
    const results = await Promise.all(
        Array.from({ length: n }, () =>
            api(env.baseUrl, '/api/orders', { method: 'POST', body: orderPayload(customerId) })
        )
    );
    return results;
};

describe('order number generation under concurrency', () => {
    test('50 simultaneous orders all succeed', async () => {
        const results = await createMany(50);
        const failed = results.filter(r => r.status !== 201);
        const reasons = [...new Set(failed.map(f => JSON.stringify(f.body).slice(0, 120)))];
        assert.equal(failed.length, 0,
            `${failed.length}/50 orders failed. Reasons: ${reasons.join(' | ')}`);
    });

    test('every generated order number is unique', async () => {
        const results = await createMany(50);
        const ids = results.filter(r => r.status === 201).map(r => r.body.orderId);
        const unique = new Set(ids);
        assert.equal(unique.size, ids.length,
            `duplicate order numbers generated: ${ids.length - unique.size} collisions`);
    });

    test('no duplicate-key error ever reaches the client', async () => {
        const results = await createMany(60);
        const dupes = results.filter(r =>
            JSON.stringify(r.body || '').includes('E11000') ||
            JSON.stringify(r.body || '').includes('duplicate key')
        );
        assert.equal(dupes.length, 0, 'a duplicate-key error surfaced to the client');
    });

    test('order numbers keep the readable #ON- prefix', async () => {
        const results = await createMany(5);
        for (const r of results) {
            assert.match(r.body.orderId, /^#ON-\d+$/,
                `unexpected order number format: ${r.body.orderId}`);
        }
    });

    test('sequential batches never collide with earlier ones', async () => {
        const first = await createMany(25);
        const second = await createMany(25);
        const all = [...first, ...second]
            .filter(r => r.status === 201)
            .map(r => r.body.orderId);
        assert.equal(new Set(all).size, all.length, 'ids collided across batches');
    });
});
