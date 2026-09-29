/**
 * Order weight: never a made-up number.
 *
 * Source priority: weighed (vendor) > customer (approx from the app) >
 * estimated (per-kg quantities + Master Service avg weight) > null ("—").
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import { startTestEnvironment, api } from '../helpers/testEnvironment.js';
import { orderPayload, createUser, tokenFor } from '../helpers/factories.js';
import MasterService from '../../src/models/MasterService.js';
import Order from '../../src/models/Order.js';
import { parseWeightKg, isInvalidWeight, resolveOrderWeight } from '../../src/utils/orderWeight.js';

let env, customer, vendor, otherVendor, shirtId, noWeightId;

before(async () => {
    env = await startTestEnvironment();
    customer = await createUser(api, env.baseUrl, '9990000081', 'Customer');
    vendor = await createUser(api, env.baseUrl, '9990000082', 'Vendor');
    otherVendor = await createUser(api, env.baseUrl, '9990000083', 'Vendor');

    await mongoose.connect(env.mongoUri);
    const categoryId = new mongoose.Types.ObjectId();
    const [shirt, blank] = await MasterService.create([
        { itemName: 'Shirt', categoryId, avgWeight: '0.25' },
        { itemName: 'Mystery', categoryId, avgWeight: '' }
    ]);
    shirtId = String(shirt._id);
    noWeightId = String(blank._id);
}, { timeout: 90000 });

after(async () => {
    await mongoose.disconnect();
    if (env) await env.stop();
});

const placeOrder = (overrides) =>
    api(env.baseUrl, '/api/orders', {
        method: 'POST', body: orderPayload(customer.id, overrides), token: customer.token
    });

const item = (serviceId, quantity, unit = 'pc') => ({ serviceId, name: 'x', quantity, price: 50, unit });

describe('weight helpers', () => {
    test('parseWeightKg accepts 0 < w <= 200 and rounds to 10 g', () => {
        assert.equal(parseWeightKg('3.456'), 3.46);
        assert.equal(parseWeightKg(200), 200);
        for (const bad of [0, -1, 200.01, 'abc', null, undefined, '']) assert.equal(parseWeightKg(bad), null);
    });

    test('isInvalidWeight only flags supplied-but-bad values', () => {
        assert.equal(isInvalidWeight(undefined), false);
        assert.equal(isInvalidWeight(''), false);
        assert.equal(isInvalidWeight(0), true);
        assert.equal(isInvalidWeight('x'), true);
        assert.equal(isInvalidWeight(2), false);
    });

    test('resolveOrderWeight prefers weighed > customer > estimated', () => {
        assert.deepEqual(resolveOrderWeight({ weighedWeight: 5, customerWeight: 3, estimatedWeight: 2 }), { totalWeight: 5, weightSource: 'weighed' });
        assert.deepEqual(resolveOrderWeight({ customerWeight: 3, estimatedWeight: 2 }), { totalWeight: 3, weightSource: 'customer' });
        assert.deepEqual(resolveOrderWeight({ estimatedWeight: 2 }), { totalWeight: 2, weightSource: 'estimated' });
        assert.deepEqual(resolveOrderWeight({}), { totalWeight: null, weightSource: null });
    });
});

describe('customer orders', () => {
    test('customer approx weight is used when given', async () => {
        const res = await placeOrder({ items: [item(shirtId, 4)], approxWeight: 3.5 });
        assert.equal(res.status, 201);
        assert.equal(res.body.totalWeight, 3.5);
        assert.equal(res.body.weightSource, 'customer');
        assert.equal(res.body.customerWeight, 3.5);
        assert.equal(res.body.estimatedWeight, 1, '4 shirts x 0.25 kg is still kept as the estimate');
    });

    test('without approx weight it is estimated from kg quantities + avg weights', async () => {
        const res = await placeOrder({ items: [item(shirtId, 4), item('000000000000000000000001', 2.5, 'kg')] });
        assert.equal(res.status, 201);
        assert.equal(res.body.totalWeight, 3.5);
        assert.equal(res.body.weightSource, 'estimated');
    });

    test('unknown piece weight -> no weight at all (not a random number)', async () => {
        const res = await placeOrder({ items: [item(shirtId, 2), item(noWeightId, 1)] });
        assert.equal(res.status, 201);
        assert.equal(res.body.totalWeight, null);
        assert.equal(res.body.weightSource, null);
    });

    test('client-sent item weights are ignored', async () => {
        const res = await placeOrder({ items: [{ ...item(noWeightId, 1), weight: 99 }] });
        assert.equal(res.status, 201);
        assert.equal(res.body.totalWeight, null);
        assert.ok(res.body.items.every(i => i.weight == null));
    });

    test('an invalid approx weight is rejected', async () => {
        for (const approxWeight of [0, -2, 500, 'heavy']) {
            const res = await placeOrder({ approxWeight });
            assert.equal(res.status, 400, `approxWeight=${approxWeight}`);
        }
    });
});

describe('walk-in orders require a weighed weight', () => {
    const walkIn = (extra = {}) => api(env.baseUrl, '/api/orders/walk-in', {
        method: 'POST',
        token: vendor.token,
        body: {
            customerPhone: '9990000084', customerName: 'Walk In', vendorId: vendor.id,
            items: [item(shirtId, 3)], totalAmount: 150, status: 'PROCESSING', ...extra
        }
    });

    test('missing or invalid weight -> 400', async () => {
        for (const weight of [undefined, '', 0, 250]) {
            const res = await walkIn(weight === undefined ? {} : { weight });
            assert.equal(res.status, 400, `weight=${weight}`);
            assert.match(res.body.message, /weight/i);
        }
    });

    test('valid weight is stored as weighed', async () => {
        const res = await walkIn({ weight: 2.75 });
        assert.equal(res.status, 201);
        const order = await Order.findById(res.body._id).lean();
        assert.equal(order.totalWeight, 2.75);
        assert.equal(order.weightSource, 'weighed');
        assert.ok(order.weighedAt);
    });
});

describe('vendor records the weighed weight', () => {
    let orderId;
    const record = (weight, token = vendor.token, id = orderId) =>
        api(env.baseUrl, `/api/orders/${id}/weight`, { method: 'PATCH', token, body: { weight } });

    before(async () => {
        const res = await placeOrder({ items: [item(shirtId, 4)], approxWeight: 3 });
        orderId = res.body._id;
        await Order.updateOne({ _id: orderId }, { vendor: vendor.id, status: 'ORDER_PLACED' });
    });

    test('not allowed before the clothes reach the vendor', async () => {
        const res = await record(4);
        assert.equal(res.status, 400);
    });

    test('another vendor or the customer cannot record it', async () => {
        await Order.updateOne({ _id: orderId }, { status: 'RECEIVED_BY_VENDOR' });
        assert.equal((await record(4, otherVendor.token)).status, 403);
        assert.equal((await record(4, customer.token)).status, 403);
    });

    test('invalid weight -> 400, unknown order -> 404', async () => {
        assert.equal((await record(0)).status, 400);
        assert.equal((await record(4, vendor.token, '60000000000000000000000b')).status, 404);
    });

    test('the handling vendor records it; it overrides the customer estimate', async () => {
        const res = await record(4.2);
        assert.equal(res.status, 200);
        assert.deepEqual(
            { totalWeight: res.body.weight.totalWeight, weightSource: res.body.weight.weightSource, customerWeight: res.body.weight.customerWeight },
            { totalWeight: 4.2, weightSource: 'weighed', customerWeight: 3 }
        );
        const order = await Order.findById(orderId).lean();
        assert.equal(order.totalWeight, 4.2);
        assert.equal(order.weighedWeight, 4.2);
        assert.equal(order.weightSource, 'weighed');
    });

    test('admin can correct it at any status', async () => {
        await Order.updateOne({ _id: orderId }, { status: 'DELIVERED' });
        const res = await record(4.4, tokenFor('Admin'));
        assert.equal(res.status, 200);
        assert.equal(res.body.weight.totalWeight, 4.4);
    });
});
