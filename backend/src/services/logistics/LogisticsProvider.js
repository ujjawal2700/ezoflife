/**
 * Logistics provider port.
 *
 * Expressed in OUR domain, not a vendor's. The app asks for "a pickup from A to
 * B"; whether that is fulfilled by Shiprocket Quick, standard Shiprocket, or an
 * in-house fleet is an implementation detail behind this interface.
 *
 * Every method resolves to a plain object and NEVER throws for an upstream
 * failure — callers get `{ ok: false, reason }` so a courier outage can never
 * take down order processing.
 */

/**
 * @typedef {Object} Address
 * @property {string} name        contact name
 * @property {string} phone       10-digit contact number
 * @property {string} address     street address
 * @property {string} [city]
 * @property {string} [pincode]
 * @property {{lat:number,lng:number}} [location]
 */

/**
 * @typedef {Object} PickupRequest
 * @property {string} referenceId  our order id, echoed back on webhooks
 * @property {Address} from
 * @property {Address} to
 * @property {'PICKUP'|'RETURN'} leg
 * @property {Date}   [scheduledAt] when the pickup should happen
 * @property {number} [declaredValue]
 */

export class LogisticsProvider {
    /** Human-readable name, used in logs and stored on the order. */
    get name() {
        throw new Error('LogisticsProvider.name must be implemented');
    }

    /**
     * Can this route be served, and at what cost/ETA?
     * @returns {Promise<{ok:boolean, available?:boolean, etaMinutes?:number, price?:number, reason?:string}>}
     */
    // eslint-disable-next-line no-unused-vars
    async checkServiceability(from, to) {
        throw new Error('checkServiceability must be implemented');
    }

    /**
     * Book a delivery task.
     * @param {PickupRequest} req
     * @returns {Promise<{ok:boolean, taskId?:string, trackingRef?:string, partner?:object, reason?:string}>}
     */
    // eslint-disable-next-line no-unused-vars
    async requestPickup(req) {
        throw new Error('requestPickup must be implemented');
    }

    /**
     * @returns {Promise<{ok:boolean, reason?:string}>}
     */
    // eslint-disable-next-line no-unused-vars
    async cancelTask(taskId) {
        throw new Error('cancelTask must be implemented');
    }

    /**
     * @returns {Promise<{ok:boolean, status?:string, partner?:object, location?:object, reason?:string}>}
     */
    // eslint-disable-next-line no-unused-vars
    async getStatus(taskId) {
        throw new Error('getStatus must be implemented');
    }

    /**
     * Translate a provider-specific webhook payload into our order status.
     * @returns {{ok:boolean, referenceId?:string, taskId?:string, status?:string, partner?:object, reason?:string}}
     */
    // eslint-disable-next-line no-unused-vars
    parseWebhook(payload) {
        throw new Error('parseWebhook must be implemented');
    }
}

/**
 * Canonical delivery states, independent of any provider's vocabulary.
 * Providers map their own statuses onto these.
 */
export const DeliveryStatus = {
    CREATED: 'CREATED',
    PARTNER_ASSIGNED: 'PARTNER_ASSIGNED',
    ARRIVED_AT_PICKUP: 'ARRIVED_AT_PICKUP',
    PICKED_UP: 'PICKED_UP',
    IN_TRANSIT: 'IN_TRANSIT',
    ARRIVED_AT_DROP: 'ARRIVED_AT_DROP',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    FAILED: 'FAILED'
};
