/**
 * Webhook authentication.
 *
 * Runs a server with LOGISTICS_WEBHOOK_SECRET configured — the production
 * posture. The endpoint moves order state, so an unauthenticated caller must
 * never be able to mark orders delivered.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestEnvironment, api } from '../helpers/testEnvironment.js';
import { orderPayload, createUser } from '../helpers/factories.js';

const SECRET = 'test-webhook-secret-value';
let env, customerId;

before(async () => {
    env = await startTestEnvironment({ env: { LOGISTICS_WEBHOOK_SECRET: SECRET } });
    const user = await createUser(api, env.baseUrl, '9990000006', 'Customer');
    customerId = user.id;
}, { timeout: 90000 });

after(async () => { if (env) await env.stop(); });

const post = (body, headers) =>
    fetch(`${env.baseUrl}/api/logistics/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(headers || {}) },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000)
    }).then(async r => ({ status: r.status, body: await r.json().catch(() => ({})) }));

describe('webhook secret enforcement', () => {
    test('rejects a request with no secret', async () => {
        const res = await post({ referenceId: 'x', status: 'DELIVERED' });
        assert.equal(res.status, 401);
    });

    test('rejects a wrong secret', async () => {
        const res = await post({ referenceId: 'x', status: 'DELIVERED' }, { 'x-webhook-secret': 'wrong' });
        assert.equal(res.status, 401);
    });

    test('rejects a secret that is merely a prefix of the real one', async () => {
        const res = await post({ referenceId: 'x', status: 'DELIVERED' }, { 'x-webhook-secret': SECRET.slice(0, 5) });
        assert.equal(res.status, 401);
    });

    test('accepts the correct secret', async () => {
        const res = await post({ referenceId: 'unknown', status: 'DELIVERED' }, { 'x-webhook-secret': SECRET });
        assert.equal(res.status, 200);
    });

    test('accepts the secret via query string', async () => {
        const r = await fetch(`${env.baseUrl}/api/logistics/webhook?secret=${SECRET}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ referenceId: 'unknown', status: 'DELIVERED' }),
            signal: AbortSignal.timeout(15000)
        });
        assert.equal(r.status, 200);
    });
});

describe('an unauthenticated caller cannot move order state', () => {
    test('a rejected webhook leaves the order untouched', async () => {
        const created = await api(env.baseUrl, '/api/orders', {
            method: 'POST', body: orderPayload(customerId)
        });
        const id = created.body._id;

        await api(env.baseUrl, `/api/orders/status/${id}`, {
            method: 'PATCH', body: { status: 'READY_FOR_DISPATCH' }
        });
        const taskId = (await api(env.baseUrl, `/api/orders/${id}`)).body.deliveryShipmentDetails.taskId;

        // Forged "delivered" with no secret.
        const forged = await post({ taskId, status: 'DELIVERED' });
        assert.equal(forged.status, 401);

        const after = (await api(env.baseUrl, `/api/orders/${id}`)).body;
        assert.notEqual(after.status, 'DELIVERED', 'an unauthenticated webhook marked the order delivered');
    });
});
