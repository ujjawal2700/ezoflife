import cron from 'node-cron';
import Order from '../models/Order.js';
import { dispatchPickup, dispatchReturn } from '../services/logistics/dispatch.js';

/**
 * Pickup & delivery scheduler.
 *
 * Every 5 minutes it looks for orders whose trigger time has passed and asks
 * the logistics provider to collect them. Booking itself — including the
 * idempotency guard — lives in services/logistics/dispatch.js, so a re-run
 * during a slow provider response cannot double-book.
 *
 * Enabled by SHIPROCKET_ENABLED. While that is false the provider resolves to
 * the mock, so this loop is safe to leave running in development.
 */

const CRON_EXPR = process.env.LOGISTICS_CRON || '*/5 * * * *';

/**
 * Orders waiting to be collected from the customer.
 *
 * `vendorAcceptOrder` is what makes an order collectable: it sets
 * pickupStatus='scheduled' and status='RIDER_ARRIVING'. The status list must
 * therefore include RIDER_ARRIVING or this query matches nothing — which is
 * exactly what the original `status: 'Assigned'` did (not even a valid enum
 * value). PICKUP_ASSIGNED is included so an order already mid-dispatch is
 * still retried after a failure.
 */
const findPendingPickups = (now) => Order.find({
    pickupStatus: 'scheduled',
    pickupTriggerTime: { $lte: now },
    status: { $in: ['RIDER_ARRIVING', 'PICKUP_ASSIGNED', 'ORDER_PLACED'] }
}).select('_id orderId').lean();

/** Orders the vendor has finished, waiting to go back to the customer. */
const findPendingDeliveries = (now) => Order.find({
    deliveryStatus: 'scheduled',
    deliveryTriggerTime: { $lte: now },
    // Previously 'Ready', also not in the enum.
    status: 'READY_FOR_DISPATCH'
}).select('_id orderId').lean();

const runOnce = async () => {
    const now = new Date();

    const [pickups, deliveries] = await Promise.all([
        findPendingPickups(now),
        findPendingDeliveries(now)
    ]);

    if (pickups.length === 0 && deliveries.length === 0) return { pickups: 0, deliveries: 0 };

    console.log(`⏰ [SCHEDULER] ${pickups.length} pickup(s), ${deliveries.length} delivery(ies) due`);

    let booked = 0;
    for (const o of pickups) {
        const r = await dispatchPickup(o._id);
        if (r.ok && !r.skipped) booked++;
        if (!r.ok) console.warn(`⚠️  [SCHEDULER] pickup for ${o.orderId}: ${r.reason}`);
    }

    for (const o of deliveries) {
        const r = await dispatchReturn(o._id);
        if (r.ok && !r.skipped) {
            booked++;
            // Only advance the order once a courier is actually engaged.
            await Order.updateOne({ _id: o._id }, { $set: { status: 'OUT_FOR_DELIVERY' } });
        }
        if (!r.ok) console.warn(`⚠️  [SCHEDULER] delivery for ${o.orderId}: ${r.reason}`);
    }

    return { pickups: pickups.length, deliveries: deliveries.length, booked };
};

export const initPickupScheduler = () => {
    if (String(process.env.LOGISTICS_SCHEDULER || 'true').toLowerCase() === 'false') {
        console.log('⏸️  [SCHEDULER] disabled via LOGISTICS_SCHEDULER=false');
        return;
    }

    cron.schedule(CRON_EXPR, async () => {
        try {
            await runOnce();
        } catch (err) {
            console.error('❌ [SCHEDULER] run failed:', err.message);
        }
    });

    const mode = String(process.env.SHIPROCKET_ENABLED || '').toLowerCase() === 'true'
        ? 'live provider'
        : 'mock provider';
    console.log(`🚚 [SCHEDULER] started (${CRON_EXPR}, ${mode})`);
};

// Exported so tests can drive one pass without waiting on cron.
export { runOnce as runSchedulerOnce };
