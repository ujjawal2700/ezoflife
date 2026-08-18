/**
 * Test data factories.
 *
 * Keep request payloads in one place so a schema change breaks one file rather
 * than twenty tests.
 */
import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET || 'test_secret_key';

/** A valid customer order payload. Override any field via `overrides`. */
export const orderPayload = (customerId, overrides = {}) => ({
    customerId,
    items: [
        { serviceId: '000000000000000000000001', name: 'Wash & Fold', quantity: 2, price: 100 }
    ],
    pickupSlot: { date: '2026-09-20', time: '02:00 PM - 04:00 PM' },
    deliverySlot: { date: '2026-09-22', time: '06:00 PM - 08:00 PM' },
    pickupAddress: '12 Test Street, Indore',
    pickupLocation: { lat: 22.7196, lng: 75.8577 },
    dropAddress: '12 Test Street, Indore',
    dropLocation: { lat: 22.7196, lng: 75.8577 },
    totalAmount: 200,
    paymentMethod: 'COD',
    ...overrides
});

/** Mint a token directly, for testing role gates without a full login flow. */
export const tokenFor = (role, id = '6a7d56c980a151d5ad8b17d0') =>
    jwt.sign({ id, role, phone: '0000000000' }, SECRET, { expiresIn: '15m' });

/**
 * Order routes now require a token, and identity is taken from it rather than
 * from the body. `asUser` binds a session so a suite reads as the actor:
 *
 *   const customer = asUser(api, env.baseUrl, session.token);
 *   await customer('/api/orders', { method: 'POST', body });
 */
export const asUser = (api, baseUrl, token) =>
    (path, opts = {}) => api(baseUrl, path, { ...opts, token: opts.token ?? token });

/**
 * A vendor that is actually able to accept an order.
 *
 * `vendorAcceptOrder` rejects a vendor unless every serviceId on the order
 * appears in shopDetails.services as active + approved, so a bare vendor
 * account is not enough for any end-to-end pickup test.
 *
 * Writes directly to the throwaway test database — there is no API for
 * attaching approved services to a vendor.
 */
export const makeVendorCapableOf = async (mongoUri, vendorId, serviceIds) => {
    const mongoose = (await import('mongoose')).default;
    const User = (await import('../../src/models/User.js')).default;

    const created = mongoose.connection.readyState === 0;
    if (created) await mongoose.connect(mongoUri);

    await User.updateOne(
        { _id: vendorId },
        {
            $set: {
                status: 'approved',
                'shopDetails.name': 'Test Laundry',
                'shopDetails.address': '45 Vendor Road, Indore',
                'shopDetails.pincode': '452001',
                'shopDetails.city': 'Indore',
                'shopDetails.services': serviceIds.map((id, i) => ({
                    id: String(id),
                    name: `Test Service ${i + 1}`,
                    adminRate: 100,
                    vendorRate: 90,
                    active: true,
                    status: 'approved'
                }))
            }
        }
    );

    if (created) await mongoose.disconnect();
};

/** Register + verify a user through the real auth endpoints. */
export const createUser = async (api, baseUrl, phone, role = 'Customer') => {
    await api(baseUrl, '/api/auth/request-otp', {
        method: 'POST',
        body: { phone, role, channel: 'SMS' }
    });
    const res = await api(baseUrl, '/api/auth/verify-otp', {
        method: 'POST',
        body: { phone, otp: '123456' }
    });
    return {
        token: res.body?.token,
        user: res.body?.user,
        id: res.body?.user?._id || res.body?.user?.id,
        status: res.status
    };
};
