/**
 * Razorpay payment verification.
 *
 * The security contract: a payment is only ever accepted when the signature is
 * genuine AND the captured amount covers what the server calculated. These tests
 * cover every rejection path that does not require calling Razorpay.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { verifyRazorpayPayment } from '../../src/utils/paymentVerification.js';

const KEY_SECRET = 'test_key_secret_for_signing';
let originalId, originalSecret;

before(() => {
    originalId = process.env.RAZORPAY_KEY_ID;
    originalSecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_ID = 'rzp_test_fake';
    process.env.RAZORPAY_KEY_SECRET = KEY_SECRET;
});

after(() => {
    process.env.RAZORPAY_KEY_ID = originalId;
    process.env.RAZORPAY_KEY_SECRET = originalSecret;
});

const sign = (orderId, paymentId, secret = KEY_SECRET) =>
    crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');

describe('verifyRazorpayPayment — rejects without a valid signature', () => {
    test('rejects when no payment fields are supplied at all', async () => {
        const r = await verifyRazorpayPayment({ expectedAmount: 100 });
        assert.equal(r.ok, false);
        assert.match(r.reason, /incomplete/i);
    });

    test('rejects when the signature is missing', async () => {
        const r = await verifyRazorpayPayment({
            razorpay_order_id: 'order_1', razorpay_payment_id: 'pay_1', expectedAmount: 100
        });
        assert.equal(r.ok, false);
        assert.match(r.reason, /incomplete/i);
    });

    test('rejects a forged signature', async () => {
        const r = await verifyRazorpayPayment({
            razorpay_order_id: 'order_1',
            razorpay_payment_id: 'pay_1',
            razorpay_signature: 'deadbeef',
            expectedAmount: 100
        });
        assert.equal(r.ok, false);
        assert.match(r.reason, /signature/i);
    });

    test('rejects a signature generated with the wrong secret', async () => {
        const r = await verifyRazorpayPayment({
            razorpay_order_id: 'order_1',
            razorpay_payment_id: 'pay_1',
            razorpay_signature: sign('order_1', 'pay_1', 'attacker_secret'),
            expectedAmount: 100
        });
        assert.equal(r.ok, false);
        assert.match(r.reason, /signature/i);
    });

    test('rejects a valid signature replayed onto a different order', async () => {
        // Signature is genuine for order_A but is presented for order_B.
        const r = await verifyRazorpayPayment({
            razorpay_order_id: 'order_B',
            razorpay_payment_id: 'pay_1',
            razorpay_signature: sign('order_A', 'pay_1'),
            expectedAmount: 100
        });
        assert.equal(r.ok, false);
        assert.match(r.reason, /signature/i);
    });

    test('a correct signature passes the signature stage', async () => {
        // With a valid signature it proceeds to the Razorpay amount check, which
        // fails here because the fake key cannot reach the real API. The point is
        // that it fails at the gateway stage, not the signature stage.
        const r = await verifyRazorpayPayment({
            razorpay_order_id: 'order_1',
            razorpay_payment_id: 'pay_1',
            razorpay_signature: sign('order_1', 'pay_1'),
            expectedAmount: 100
        });
        assert.equal(r.ok, false);
        assert.doesNotMatch(r.reason, /Invalid payment signature/i);
    });
});

describe('verifyRazorpayPayment — configuration guards', () => {
    test('refuses to verify when gateway keys are absent', async () => {
        const savedId = process.env.RAZORPAY_KEY_ID;
        const savedSecret = process.env.RAZORPAY_KEY_SECRET;
        delete process.env.RAZORPAY_KEY_ID;
        delete process.env.RAZORPAY_KEY_SECRET;

        const r = await verifyRazorpayPayment({
            razorpay_order_id: 'o', razorpay_payment_id: 'p',
            razorpay_signature: 's', expectedAmount: 100
        });

        process.env.RAZORPAY_KEY_ID = savedId;
        process.env.RAZORPAY_KEY_SECRET = savedSecret;

        assert.equal(r.ok, false);
        assert.match(r.reason, /not configured/i);
        // Critically: absent config must fail closed, never open.
    });

    test('never returns ok:true on any failure path', async () => {
        const attempts = [
            {},
            { razorpay_order_id: 'o' },
            { razorpay_order_id: 'o', razorpay_payment_id: 'p' },
            { razorpay_order_id: 'o', razorpay_payment_id: 'p', razorpay_signature: 'bad' }
        ];
        for (const a of attempts) {
            const r = await verifyRazorpayPayment({ ...a, expectedAmount: 500 });
            assert.equal(r.ok, false);
        }
    });
});
