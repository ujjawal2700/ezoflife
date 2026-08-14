import crypto from 'crypto';
import Razorpay from 'razorpay';

/**
 * Razorpay Payment Verification
 *
 * The client is never trusted to report whether a payment succeeded. Every
 * online payment must clear two independent checks before an order is marked Paid:
 *
 *   1. SIGNATURE  — proves the payment genuinely came from Razorpay and was not
 *                   forged or replayed from another order.
 *   2. AMOUNT     — proves the customer paid the full amount the server calculated.
 *                   Checked against Razorpay's own records rather than the request
 *                   body, because the checkout order is opened with a client-supplied
 *                   amount and could otherwise be created for a token sum.
 *
 * Returns { ok: true, paymentId, amountPaid } or { ok: false, reason }.
 */
export const verifyRazorpayPayment = async ({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    expectedAmount
}) => {
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
        return { ok: false, reason: 'Payment gateway is not configured on the server' };
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return { ok: false, reason: 'Payment confirmation is incomplete' };
    }

    // --- Check 1: signature ---
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest('hex');

    const provided = Buffer.from(String(razorpay_signature));
    const expected = Buffer.from(expectedSignature);

    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
        return { ok: false, reason: 'Invalid payment signature' };
    }

    // --- Check 2: amount actually captured, per Razorpay ---
    try {
        const instance = new Razorpay({
            key_id: process.env.RAZORPAY_KEY_ID,
            key_secret: process.env.RAZORPAY_KEY_SECRET
        });

        const payment = await instance.payments.fetch(razorpay_payment_id);

        if (payment.order_id !== razorpay_order_id) {
            return { ok: false, reason: 'Payment does not belong to this checkout' };
        }

        if (payment.status !== 'captured' && payment.status !== 'authorized') {
            return { ok: false, reason: `Payment was not completed (status: ${payment.status})` };
        }

        // Razorpay reports paise; allow a 1 rupee tolerance for rounding.
        const paidInRupees = Number(payment.amount) / 100;
        if (paidInRupees + 1 < Number(expectedAmount)) {
            return {
                ok: false,
                reason: `Amount paid (₹${paidInRupees}) is less than the order total (₹${expectedAmount})`
            };
        }

        return { ok: true, paymentId: razorpay_payment_id, amountPaid: paidInRupees };
    } catch (error) {
        console.error('❌ [PAYMENT_VERIFY] Could not confirm payment with Razorpay:', error.message);
        return { ok: false, reason: 'Could not confirm this payment with the gateway' };
    }
};
