import axios from 'axios';
import { LogisticsProvider, DeliveryStatus } from './LogisticsProvider.js';

/**
 * Shiprocket Quick (hyperlocal) provider.
 *
 * Implemented against the DOCUMENTED standard Shiprocket API
 * (`apiv2.shiprocket.in/v1/external`), because Shiprocket publishes no separate
 * specification for Quick. For same-city routes, hyperlocal partners surface
 * through the ordinary `/courier/serviceability` call when the account has them
 * enabled — so this works unchanged if Quick rides the standard surface.
 *
 * Endpoints used (all confirmed against Shiprocket's published docs):
 *   POST /auth/login                  bearer token, valid 240 hours
 *   GET  /courier/serviceability/     available couriers + rate for a route
 *   POST /orders/create/adhoc         forward shipment  (vendor → customer)
 *   POST /orders/create/return        reverse shipment  (customer → vendor)
 *   POST /courier/assign/awb          AWB + courier assignment
 *   POST /courier/generate/pickup     pickup request
 *   POST /orders/cancel               cancel by Shiprocket order id
 *   GET  /courier/track/awb/{awb}     tracking
 *
 * ⚠️ TWO THINGS TO VERIFY BEFORE PRODUCTION:
 *   1. `parseWebhook()` — the status strings are inferred, not observed.
 *      Check them against one real callback payload.
 *   2. If Shiprocket confirm Quick has its OWN API, only this file changes;
 *      everything upstream is provider-agnostic.
 */

const BASE_URL = process.env.SHIPROCKET_BASE_URL || 'https://apiv2.shiprocket.in/v1/external';

// Refresh a little before the documented 240h so we never race the expiry.
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000; // 9 days

/**
 * Laundry has no per-item weight, so shipments are declared with a sensible
 * default. Tune to your typical load rather than leaving it at 2kg in production —
 * couriers price on weight.
 */
const DEFAULT_WEIGHT_KG = Number(process.env.SHIPROCKET_DEFAULT_WEIGHT_KG || 2);
const DIMENSIONS = {
    length: Number(process.env.SHIPROCKET_PKG_LENGTH_CM || 30),
    breadth: Number(process.env.SHIPROCKET_PKG_BREADTH_CM || 30),
    height: Number(process.env.SHIPROCKET_PKG_HEIGHT_CM || 20)
};

/** Pincode can arrive on the address itself or nested under location. */
const pincodeOf = (addr) =>
    addr?.pincode || addr?.location?.pincode || addr?.postcode || '';

/** Turn an axios failure into something readable in a log or an order note. */
const describeAxiosError = (err) => {
    const status = err?.response?.status;
    const body = err?.response?.data;
    const detail = typeof body === 'string'
        ? body.slice(0, 200)
        : JSON.stringify(body || {}).slice(0, 200);
    return status ? `Shiprocket ${status}: ${detail}` : (err?.message || 'unknown error');
};

export class ShiprocketQuickProvider extends LogisticsProvider {
    constructor({ email, password, channelId, pickupLocation } = {}) {
        super();
        this.email = email ?? process.env.SHIPROCKET_EMAIL;
        this.password = password ?? process.env.SHIPROCKET_PASSWORD;
        this.channelId = channelId ?? process.env.SHIPROCKET_CHANNEL_ID;
        this.pickupLocation = pickupLocation ?? process.env.SHIPROCKET_PICKUP_LOCATION;

        this._token = null;
        this._tokenExpiresAt = 0;
        this._inFlightLogin = null;
    }

    get name() {
        return 'shiprocket-quick';
    }

    get isConfigured() {
        return Boolean(this.email && this.password);
    }

    // ─── Authentication (implemented — endpoint confirmed) ────────────────────

    /**
     * Returns a valid bearer token, logging in only when needed.
     * Concurrent callers share one in-flight login rather than stampeding.
     */
    async getToken({ force = false } = {}) {
        if (!this.isConfigured) {
            throw new Error('SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD must be set');
        }
        if (!force && this._token && Date.now() < this._tokenExpiresAt) {
            return this._token;
        }
        if (this._inFlightLogin) return this._inFlightLogin;

        this._inFlightLogin = (async () => {
            try {
                const res = await axios.post(
                    `${BASE_URL}/auth/login`,
                    { email: this.email, password: this.password },
                    { timeout: 15000, headers: { 'Content-Type': 'application/json' } }
                );
                const token = res.data?.token;
                if (!token) throw new Error('login response contained no token');

                this._token = token;
                this._tokenExpiresAt = Date.now() + TOKEN_TTL_MS;
                console.log('🔐 [SHIPROCKET] authenticated; token cached for 9 days');
                return token;
            } finally {
                this._inFlightLogin = null;
            }
        })();

        return this._inFlightLogin;
    }

    /** Authenticated request with a single retry after re-auth on 401. */
    async request(config) {
        const send = async (token) => axios({
            baseURL: BASE_URL,
            timeout: 20000,
            ...config,
            headers: {
                'Content-Type': 'application/json',
                ...(config.headers || {}),
                Authorization: `Bearer ${token}`
            }
        });

        let token = await this.getToken();
        try {
            return await send(token);
        } catch (err) {
            if (err.response?.status === 401) {
                console.warn('🔐 [SHIPROCKET] token rejected; re-authenticating');
                token = await this.getToken({ force: true });
                return send(token);
            }
            throw err;
        }
    }

    // ─── Dispatch (PENDING the Quick specification) ───────────────────────────
    // Each returns ok:false rather than throwing, so a booking failure degrades
    // to "not dispatched" instead of crashing the scheduler or an order request.

    /**
     * GET /courier/serviceability/
     *
     * Returns the cheapest serviceable courier for the route. For same-city
     * routes this is where hyperlocal (Quick) partners appear, if your account
     * has them enabled.
     */
    async checkServiceability(from, to) {
        const pickup = pincodeOf(from);
        const delivery = pincodeOf(to);

        if (!pickup || !delivery) {
            return { ok: false, reason: `missing pincode (pickup=${pickup || '-'} delivery=${delivery || '-'})` };
        }

        try {
            const res = await this.request({
                method: 'GET',
                url: '/courier/serviceability/',
                params: {
                    pickup_postcode: pickup,
                    delivery_postcode: delivery,
                    weight: DEFAULT_WEIGHT_KG,
                    cod: 0
                }
            });

            const couriers = res.data?.data?.available_courier_companies || [];
            if (couriers.length === 0) {
                return { ok: true, available: false, reason: 'no courier serves this route' };
            }

            // Cheapest first; `etd_hours`/`estimated_delivery_days` vary by courier.
            const best = [...couriers].sort((a, b) => (a.rate ?? 1e9) - (b.rate ?? 1e9))[0];
            const etaMinutes = best.etd_hours != null
                ? Number(best.etd_hours) * 60
                : (best.estimated_delivery_days != null ? Number(best.estimated_delivery_days) * 24 * 60 : undefined);

            return {
                ok: true,
                available: true,
                price: best.rate,
                etaMinutes,
                courierId: best.courier_company_id,
                partnerName: best.courier_name
            };
        } catch (err) {
            return { ok: false, reason: describeAxiosError(err) };
        }
    }

    /**
     * Book a delivery. Shiprocket needs four calls in sequence:
     *
     *   1. create the order      → order_id, shipment_id
     *   2. pick a courier        → courier_company_id   (serviceability)
     *   3. assign an AWB         → awb_code
     *   4. request the pickup    → pickup_token_number
     *
     * Note on direction: our PICKUP leg collects FROM the customer, which is a
     * *reverse* shipment in Shiprocket's vocabulary. Our RETURN leg delivers
     * clean laundry FROM the vendor, which is an ordinary forward shipment.
     */
    async requestPickup(req) {
        const { referenceId, leg, from, to } = req;
        const isReverse = leg === 'PICKUP';

        try {
            // ── 1. create the order ──
            const created = await this.request({
                method: 'POST',
                url: isReverse ? '/orders/create/return' : '/orders/create/adhoc',
                data: this.buildOrderPayload(req, isReverse)
            });

            const shipmentId = created.data?.shipment_id;
            const providerOrderId = created.data?.order_id;
            if (!shipmentId) {
                return { ok: false, reason: `order created without a shipment_id: ${JSON.stringify(created.data).slice(0, 200)}` };
            }

            // ── 2. choose a courier ──
            const serviceable = await this.checkServiceability(from, to);
            if (!serviceable.ok || !serviceable.available) {
                return { ok: false, reason: serviceable.reason || 'no serviceable courier', providerOrderId, taskId: shipmentId };
            }

            // ── 3. assign an AWB ──
            const awbRes = await this.request({
                method: 'POST',
                url: '/courier/assign/awb',
                data: { shipment_id: shipmentId, courier_id: serviceable.courierId }
            });

            const awb = awbRes.data?.response?.data?.awb_code || awbRes.data?.awb_code;
            if (!awb) {
                return { ok: false, reason: 'courier accepted but returned no AWB', providerOrderId, taskId: shipmentId };
            }

            // ── 4. request the pickup ──
            let pickupToken;
            try {
                const pickupRes = await this.request({
                    method: 'POST',
                    url: '/courier/generate/pickup',
                    data: { shipment_id: [shipmentId] }
                });
                pickupToken = pickupRes.data?.response?.pickup_token_number
                    ?? pickupRes.data?.pickup_token_number;
            } catch (err) {
                // The shipment exists and has an AWB; a failed pickup request is
                // recoverable by ops, so do not fail the whole booking.
                console.warn(`⚠️  [SHIPROCKET] pickup request failed for ${referenceId}: ${describeAxiosError(err)}`);
            }

            console.log(`🚚 [SHIPROCKET] ${leg} booked for ${referenceId} — AWB ${awb} via ${serviceable.partnerName}`);

            return {
                ok: true,
                taskId: String(shipmentId),
                trackingRef: awb,
                providerOrderId: providerOrderId ? String(providerOrderId) : undefined,
                courierName: serviceable.partnerName,
                pickupToken
            };
        } catch (err) {
            return { ok: false, reason: describeAxiosError(err) };
        }
    }

    /** Request payload for an order. Laundry has no SKUs, so the job is one line item. */
    buildOrderPayload(req, isReverse) {
        const { referenceId, from, to, declaredValue } = req;

        const base = {
            order_id: referenceId,
            order_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
            channel_id: this.channelId || undefined,
            payment_method: 'Prepaid',
            sub_total: Number(declaredValue) || 0,
            length: DIMENSIONS.length,
            breadth: DIMENSIONS.breadth,
            height: DIMENSIONS.height,
            weight: DEFAULT_WEIGHT_KG,
            order_items: [{
                name: 'Laundry',
                sku: `LAUNDRY-${referenceId}`,
                units: 1,
                selling_price: Number(declaredValue) || 0
            }]
        };

        if (isReverse) {
            // Reverse: collected from the customer, delivered to the vendor.
            return {
                ...base,
                pickup_customer_name: from.name,
                pickup_phone: from.phone,
                pickup_address: from.address,
                pickup_city: from.city,
                pickup_pincode: pincodeOf(from),
                pickup_state: from.state || '',
                pickup_country: 'India',
                shipping_customer_name: to.name,
                shipping_phone: to.phone,
                shipping_address: to.address,
                shipping_city: to.city,
                shipping_pincode: pincodeOf(to),
                shipping_country: 'India'
            };
        }

        // Forward: dispatched from a registered pickup location to the customer.
        return {
            ...base,
            pickup_location: this.pickupLocation,
            billing_customer_name: to.name,
            billing_last_name: '',
            billing_address: to.address,
            billing_city: to.city,
            billing_pincode: pincodeOf(to),
            billing_state: to.state || '',
            billing_country: 'India',
            billing_email: to.email || 'noreply@example.com',
            billing_phone: to.phone,
            shipping_is_billing: true
        };
    }

    /** POST /orders/cancel — takes Shiprocket order ids, not shipment ids. */
    async cancelTask(providerOrderId) {
        if (!providerOrderId) return { ok: false, reason: 'no provider order id supplied' };
        try {
            await this.request({
                method: 'POST',
                url: '/orders/cancel',
                data: { ids: [providerOrderId] }
            });
            return { ok: true };
        } catch (err) {
            return { ok: false, reason: describeAxiosError(err) };
        }
    }

    /**
     * GET /courier/track/awb/{awb}
     * Takes the AWB (trackingRef), which is what Shiprocket indexes tracking by.
     */
    async getStatus(trackingRef) {
        if (!trackingRef) return { ok: false, reason: 'no tracking reference supplied' };
        try {
            const res = await this.request({
                method: 'GET',
                url: `/courier/track/awb/${encodeURIComponent(trackingRef)}`
            });

            const data = res.data?.tracking_data || res.data;
            const raw = data?.shipment_track?.[0]?.current_status
                ?? data?.shipment_status
                ?? '';

            const mapped = this.parseWebhook({ status: raw, task_id: trackingRef });

            return {
                ok: true,
                status: mapped.ok ? mapped.status : undefined,
                rawStatus: raw,
                partner: data?.shipment_track?.[0]?.courier_name
                    ? { name: data.shipment_track[0].courier_name }
                    : undefined,
                location: data?.shipment_track_activities?.[0]?.location
            };
        } catch (err) {
            return { ok: false, reason: describeAxiosError(err) };
        }
    }

    /**
     * Webhook mapping. The envelope below is a best guess and MUST be checked
     * against a real Shiprocket Quick payload before going live — the mapping
     * table is the only part that should need editing.
     */
    parseWebhook(payload) {
        if (!payload || typeof payload !== 'object') {
            return { ok: false, reason: 'empty payload' };
        }

        const referenceId = payload.order_id ?? payload.reference_id ?? payload.client_order_id;
        const taskId = payload.task_id ?? payload.shipment_id ?? payload.awb;
        const raw = String(payload.status ?? payload.current_status ?? '').toUpperCase();

        const MAP = {
            'CREATED': DeliveryStatus.CREATED,
            'ASSIGNED': DeliveryStatus.PARTNER_ASSIGNED,
            'RIDER_ASSIGNED': DeliveryStatus.PARTNER_ASSIGNED,
            'ARRIVED': DeliveryStatus.ARRIVED_AT_PICKUP,
            'REACHED_PICKUP': DeliveryStatus.ARRIVED_AT_PICKUP,
            'PICKED_UP': DeliveryStatus.PICKED_UP,
            'PICKUP_DONE': DeliveryStatus.PICKED_UP,
            'IN_TRANSIT': DeliveryStatus.IN_TRANSIT,
            'OUT_FOR_DELIVERY': DeliveryStatus.IN_TRANSIT,
            'REACHED_DROP': DeliveryStatus.ARRIVED_AT_DROP,
            'DELIVERED': DeliveryStatus.DELIVERED,
            'CANCELLED': DeliveryStatus.CANCELLED,
            'CANCELED': DeliveryStatus.CANCELLED,
            'FAILED': DeliveryStatus.FAILED,
            'RTO': DeliveryStatus.FAILED
        };

        const status = MAP[raw];
        if (!status) return { ok: false, reason: `unmapped provider status "${raw}"` };
        if (!referenceId && !taskId) return { ok: false, reason: 'payload identifies no order' };

        return {
            ok: true,
            referenceId,
            taskId,
            status,
            partner: payload.rider || payload.partner || undefined
        };
    }
}

export default ShiprocketQuickProvider;
