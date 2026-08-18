/**
 * Pickup leg, driven through the real flow.
 *
 * The scheduler only collects orders whose status matches its filter. That
 * filter and `vendorAcceptOrder` must agree — they did not originally (the
 * query looked for 'Assigned', which is not even a valid enum value), so no
 * pickup was ever dispatched.
 *
 * These tests drive vendor acceptance and then run one scheduler pass, so a
 * future change to either side breaks here rather than silently in production.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { startTestEnvironment, api } from '../helpers/testEnvironment.js';
import { orderPayload, createUser, makeVendorCapableOf } from '../helpers/factories.js';

let env, customerId, vendorId, customerToken, vendorToken;

before(async () => {
    env = await startTestEnvironment();
    const customer = await createUser(api, env.baseUrl, '9990000007', 'Customer');
    const vendor = await createUser(api, env.baseUrl, '9990000008', 'Vendor');
    customerId = customer.id; customerToken = customer.token;
    vendorId = vendor.id;     vendorToken = vendor.token;
    assert.ok(customerId && vendorId, 'fixtures should exist');

    // The vendor must offer the order's services or acceptance is refused.
    await makeVendorCapableOf(env.mongoUri, vendorId, ['000000000000000000000001']);
}, { timeout: 90000 });

after(async () => { if (env) await env.stop(); });

const newOrder = async () => {
    const res = await api(env.baseUrl, '/api/orders', {
        method: 'POST', body: orderPayload(customerId), token: customerToken
    });
    assert.equal(res.status, 201);
    return res.body;
};

// The accepting vendor is now taken from the token, not the body.
const vendorAccept = (orderId) =>
    api(env.baseUrl, `/api/orders/vendor-accept/${orderId}`, {
        method: 'POST', body: {}, token: vendorToken
    });

const getOrder = async (id) => (await api(env.baseUrl, `/api/orders/${id}`, { token: customerToken })).body;

describe('vendor acceptance schedules the pickup', () => {
    test('sets pickupStatus to scheduled', async () => {
        const order = await newOrder();
        const res = await vendorAccept(order._id);
        assert.ok(res.status < 400, `vendor-accept failed: ${res.status} ${JSON.stringify(res.body).slice(0, 200)}`);

        const after = await getOrder(order._id);
        assert.equal(after.pickupStatus, 'scheduled');
    });

    test('leaves the order in a status the scheduler actually looks for', async () => {
        const order = await newOrder();
        await vendorAccept(order._id);
        const after = await getOrder(order._id);

        // Mirrors findPendingPickups in pickupScheduler.js. If someone changes
        // one side without the other, this is the test that catches it.
        const SCHEDULER_MATCHES = ['RIDER_ARRIVING', 'PICKUP_ASSIGNED', 'ORDER_PLACED'];
        assert.ok(
            SCHEDULER_MATCHES.includes(after.status),
            `order status "${after.status}" is not matched by the pickup scheduler — ` +
            `pickups will never dispatch. Scheduler looks for: ${SCHEDULER_MATCHES.join(', ')}`
        );
    });
});

describe('the scheduler dispatches an accepted order', () => {
    test('one pass books the pickup leg', async () => {
        const order = await newOrder();
        await vendorAccept(order._id);

        // Trigger time is in the future for a normal slot; pull it back so the
        // order is due now, exactly as it would be when the slot arrives.
        await mongoose.connect(env.mongoUri);
        const Order = (await import('../../src/models/Order.js')).default;
        await Order.updateOne({ _id: order._id }, { $set: { pickupTriggerTime: new Date(Date.now() - 60000) } });

        const { runSchedulerOnce } = await import('../../src/jobs/pickupScheduler.js');
        const result = await runSchedulerOnce();

        assert.ok(result.pickups >= 1, `scheduler found no due pickups (${JSON.stringify(result)})`);

        const after = await Order.findById(order._id).lean();
        assert.ok(after.shipmentDetails?.taskId, 'pickup leg was not booked');
        assert.match(after.shipmentDetails.taskId, /^MOCK-PICKUP-/);

        await mongoose.disconnect();
    });

    test('a second pass does not re-book the same pickup', async () => {
        const order = await newOrder();
        await vendorAccept(order._id);

        await mongoose.connect(env.mongoUri);
        const Order = (await import('../../src/models/Order.js')).default;
        await Order.updateOne({ _id: order._id }, { $set: { pickupTriggerTime: new Date(Date.now() - 60000) } });

        const { runSchedulerOnce } = await import('../../src/jobs/pickupScheduler.js');
        await runSchedulerOnce();
        const first = (await Order.findById(order._id).lean()).shipmentDetails.taskId;

        await runSchedulerOnce();
        const second = (await Order.findById(order._id).lean()).shipmentDetails.taskId;

        assert.equal(second, first, 'the scheduler double-booked a pickup');
        await mongoose.disconnect();
    });

    test('an order whose trigger time has not arrived is left alone', async () => {
        const order = await newOrder();
        await vendorAccept(order._id);

        await mongoose.connect(env.mongoUri);
        const Order = (await import('../../src/models/Order.js')).default;
        await Order.updateOne(
            { _id: order._id },
            { $set: { pickupTriggerTime: new Date(Date.now() + 60 * 60 * 1000) } }
        );

        const { runSchedulerOnce } = await import('../../src/jobs/pickupScheduler.js');
        await runSchedulerOnce();

        const after = await Order.findById(order._id).lean();
        assert.ok(!after.shipmentDetails?.taskId, 'dispatched a pickup before its slot');
        await mongoose.disconnect();
    });
});
