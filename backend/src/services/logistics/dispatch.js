import Order from '../../models/Order.js';
import { getLogisticsProvider } from './index.js';

/**
 * Order dispatch — the two legs of a laundry job.
 *
 *   PICKUP leg : customer → vendor   (collect the dirty laundry)
 *   RETURN leg : vendor  → customer  (deliver the clean laundry)
 *
 * IDEMPOTENCY IS THE POINT OF THIS MODULE. The scheduler runs every 5 minutes;
 * without a guard a slow provider response would book — and bill for — the same
 * delivery repeatedly. Every dispatch first claims the order with a conditional
 * update, so only one caller can ever be in flight per leg.
 */

const LEG = {
    PICKUP: {
        name: 'PICKUP',
        detailsField: 'shipmentDetails',
        statusField: 'pickupStatus'
    },
    RETURN: {
        name: 'RETURN',
        detailsField: 'deliveryShipmentDetails',
        statusField: 'deliveryStatus'
    }
};

/** Build an Address from whatever shape the order/user happens to carry. */
const addressOf = (party, fallbackAddress, fallbackLocation) => ({
    name: party?.displayName || party?.shopDetails?.name || party?.name || 'Customer',
    phone: party?.phone || '',
    address: fallbackAddress || party?.address || party?.shopDetails?.address || '',
    city: party?.shopDetails?.city || party?.city || '',
    pincode: party?.shopDetails?.pincode || party?.pincode || '',
    location: fallbackLocation || party?.location || undefined
});

/**
 * Atomically claim a leg for dispatch.
 * Returns the claimed order, or null if another run already has it.
 */
const claimLeg = async (orderId, leg) => {
    const { detailsField, statusField } = leg;
    return Order.findOneAndUpdate(
        {
            _id: orderId,
            // Not already booked...
            [`${detailsField}.taskId`]: { $in: [null, undefined] },
            // ...and not already claimed by a concurrent run.
            [statusField]: { $ne: 'requested' }
        },
        { $set: { [statusField]: 'requested' } },
        { new: true }
    ).populate('customer vendor');
};

/** Release a claim so a later run can retry after a failure. */
const releaseLeg = (orderId, leg, status = 'scheduled') =>
    Order.updateOne({ _id: orderId }, { $set: { [leg.statusField]: status } });

/**
 * Dispatch one leg of an order.
 * @param {string} orderId
 * @param {'PICKUP'|'RETURN'} legName
 * @returns {Promise<{ok:boolean, skipped?:boolean, taskId?:string, reason?:string}>}
 */
export const dispatchLeg = async (orderId, legName) => {
    const leg = LEG[legName];
    if (!leg) return { ok: false, reason: `unknown leg "${legName}"` };

    const order = await claimLeg(orderId, leg);
    if (!order) {
        // Already booked or already in flight — this is the normal, healthy path
        // for a scheduler re-run, not an error.
        return { ok: true, skipped: true, reason: 'already dispatched or in flight' };
    }

    const provider = getLogisticsProvider();

    try {
        const customer = order.customer;
        const vendor = order.vendor;

        const customerAddr = addressOf(customer, order.pickupAddress, order.pickupLocation);
        const vendorAddr = addressOf(vendor, vendor?.shopDetails?.address, vendor?.location);
        const dropAddr = addressOf(customer, order.dropAddress, order.dropLocation);

        const from = leg.name === 'PICKUP' ? customerAddr : vendorAddr;
        const to = leg.name === 'PICKUP' ? vendorAddr : dropAddr;

        const serviceable = await provider.checkServiceability(from, to);
        if (!serviceable.ok || serviceable.available === false) {
            await releaseLeg(orderId, leg, 'failed');
            return { ok: false, reason: serviceable.reason || 'route not serviceable' };
        }

        const booking = await provider.requestPickup({
            referenceId: order.orderId || String(order._id),
            leg: leg.name,
            from,
            to,
            scheduledAt: leg.name === 'PICKUP' ? order.pickupTriggerTime : order.deliveryTriggerTime,
            declaredValue: order.totalAmount
        });

        if (!booking.ok || !booking.taskId) {
            // Back to 'scheduled' so the next scheduler pass can retry.
            await releaseLeg(orderId, leg, 'scheduled');
            return { ok: false, reason: booking.reason || 'provider returned no task id' };
        }

        await Order.updateOne(
            { _id: orderId },
            {
                $set: {
                    [`${leg.detailsField}.taskId`]: booking.taskId,
                    [`${leg.detailsField}.shipmentId`]: booking.taskId,
                    [`${leg.detailsField}.awbCode`]: booking.trackingRef || booking.taskId,
                    // The provider's own order id — required to cancel later.
                    [`${leg.detailsField}.orderId`]: booking.providerOrderId,
                    [`${leg.detailsField}.courierName`]: booking.courierName || provider.name,
                    [`${leg.detailsField}.pickupTokenNumber`]: booking.pickupToken,
                    [`${leg.detailsField}.lastStatus`]: 'CREATED',
                    ...(booking.partner
                        ? {
                            riderDetails: {
                                name: booking.partner.name,
                                phone: booking.partner.phone,
                                photo: booking.partner.photo
                            }
                        }
                        : {})
                }
            }
        );

        console.log(`✅ [DISPATCH] ${leg.name} booked for ${order.orderId} → task ${booking.taskId}`);
        return { ok: true, taskId: booking.taskId };
    } catch (err) {
        console.error(`❌ [DISPATCH] ${leg.name} failed for order ${orderId}:`, err.message);
        await releaseLeg(orderId, leg, 'scheduled');
        return { ok: false, reason: err.message };
    }
};

export const dispatchPickup = (orderId) => dispatchLeg(orderId, 'PICKUP');
export const dispatchReturn = (orderId) => dispatchLeg(orderId, 'RETURN');
