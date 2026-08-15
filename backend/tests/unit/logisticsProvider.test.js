/**
 * Logistics provider selection, auth caching, and webhook mapping.
 *
 * The selection tests matter operationally: a misconfigured deployment must
 * fall back to the mock and book nothing, never half-attempt a live booking.
 */
import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

import {
    getLogisticsProvider,
    resetLogisticsProvider,
    MockProvider,
    ShiprocketQuickProvider,
    DeliveryStatus
} from '../../src/services/logistics/index.js';

const ENV_KEYS = ['SHIPROCKET_ENABLED', 'SHIPROCKET_EMAIL', 'SHIPROCKET_PASSWORD'];
let saved;

beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]]));
    for (const k of ENV_KEYS) delete process.env[k];
    resetLogisticsProvider();
});

afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
    resetLogisticsProvider();
    mock.restoreAll();
});

describe('provider selection', () => {
    test('defaults to the mock when SHIPROCKET_ENABLED is unset', () => {
        assert.equal(getLogisticsProvider().name, 'mock');
    });

    test('stays on the mock when explicitly disabled', () => {
        process.env.SHIPROCKET_ENABLED = 'false';
        assert.equal(getLogisticsProvider().name, 'mock');
    });

    test('falls back to the mock when enabled but credentials are missing', () => {
        process.env.SHIPROCKET_ENABLED = 'true';
        // A half-configured deployment must not attempt live bookings.
        assert.equal(getLogisticsProvider().name, 'mock');
    });

    test('uses the live provider only when enabled AND configured', () => {
        process.env.SHIPROCKET_ENABLED = 'true';
        process.env.SHIPROCKET_EMAIL = 'ops@example.com';
        process.env.SHIPROCKET_PASSWORD = 'secret';
        assert.equal(getLogisticsProvider().name, 'shiprocket-quick');
    });

    test('is memoised across calls', () => {
        assert.equal(getLogisticsProvider(), getLogisticsProvider());
    });
});

describe('MockProvider', () => {
    const p = new MockProvider();

    test('reports the route as serviceable', async () => {
        const r = await p.checkServiceability({}, {});
        assert.equal(r.ok, true);
        assert.equal(r.available, true);
    });

    test('books a task with a MOCK- prefixed id', async () => {
        const r = await p.requestPickup({ referenceId: '#ON-1', leg: 'PICKUP', from: {}, to: {} });
        assert.equal(r.ok, true);
        assert.match(r.taskId, /^MOCK-PICKUP-/);
    });

    test('issues a distinct id per booking', async () => {
        const a = await p.requestPickup({ referenceId: '#ON-1', leg: 'PICKUP', from: {}, to: {} });
        const b = await p.requestPickup({ referenceId: '#ON-2', leg: 'PICKUP', from: {}, to: {} });
        assert.notEqual(a.taskId, b.taskId);
    });

    test('rejects a webhook payload that identifies no order', () => {
        assert.equal(p.parseWebhook({ status: 'DELIVERED' }).ok, false);
    });

    test('rejects an unknown status', () => {
        assert.equal(p.parseWebhook({ referenceId: 'x', status: 'NONSENSE' }).ok, false);
    });
});

describe('ShiprocketQuickProvider — authentication', () => {
    const make = () => new ShiprocketQuickProvider({ email: 'a@b.c', password: 'pw' });

    test('requests a token and caches it', async () => {
        const post = mock.method(axios, 'post', async () => ({ data: { token: 'TKN-1' } }));
        const p = make();

        assert.equal(await p.getToken(), 'TKN-1');
        assert.equal(await p.getToken(), 'TKN-1');
        // Cached: only one login despite two calls.
        assert.equal(post.mock.callCount(), 1);
    });

    test('posts to the documented login endpoint', async () => {
        const post = mock.method(axios, 'post', async () => ({ data: { token: 'T' } }));
        await make().getToken();
        assert.match(post.mock.calls[0].arguments[0], /\/auth\/login$/);
    });

    test('re-authenticates when forced', async () => {
        const post = mock.method(axios, 'post', async () => ({ data: { token: 'T' } }));
        const p = make();
        await p.getToken();
        await p.getToken({ force: true });
        assert.equal(post.mock.callCount(), 2);
    });

    test('concurrent callers share a single login', async () => {
        const post = mock.method(axios, 'post', async () => {
            await new Promise(r => setTimeout(r, 30));
            return { data: { token: 'T' } };
        });
        const p = make();
        await Promise.all([p.getToken(), p.getToken(), p.getToken()]);
        assert.equal(post.mock.callCount(), 1, 'login stampede — should be de-duplicated');
    });

    test('throws when the login response carries no token', async () => {
        mock.method(axios, 'post', async () => ({ data: {} }));
        await assert.rejects(() => make().getToken(), /no token/i);
    });

    test('refuses to authenticate without credentials', async () => {
        const p = new ShiprocketQuickProvider({ email: '', password: '' });
        await assert.rejects(() => p.getToken(), /SHIPROCKET_EMAIL/);
    });
});

describe('ShiprocketQuickProvider — dispatch', () => {
    const ADDR = (pincode) => ({
        name: 'X', phone: '9000000000', address: '1 St', city: 'Indore', pincode
    });

    /** Stub the authenticated transport so nothing touches the network. */
    const withTransport = (handler) => {
        const p = new ShiprocketQuickProvider({ email: 'a@b.c', password: 'pw', pickupLocation: 'Primary' });
        mock.method(p, 'request', handler);
        return p;
    };

    const COURIERS = {
        data: { data: { available_courier_companies: [
            { courier_company_id: 10, courier_name: 'Slow', rate: 90, etd_hours: 48 },
            { courier_company_id: 20, courier_name: 'Quick Hyperlocal', rate: 40, etd_hours: 2 }
        ] } }
    };

    test('serviceability picks the cheapest courier', async () => {
        const p = withTransport(async () => COURIERS);
        const r = await p.checkServiceability(ADDR('452001'), ADDR('452010'));
        assert.equal(r.ok, true);
        assert.equal(r.available, true);
        assert.equal(r.courierId, 20);
        assert.equal(r.price, 40);
        assert.equal(r.etaMinutes, 120);
    });

    test('serviceability reports an unserved route without failing', async () => {
        const p = withTransport(async () => ({ data: { data: { available_courier_companies: [] } } }));
        const r = await p.checkServiceability(ADDR('452001'), ADDR('452010'));
        assert.equal(r.ok, true);
        assert.equal(r.available, false);
    });

    test('serviceability refuses to call the API without pincodes', async () => {
        let called = false;
        const p = withTransport(async () => { called = true; return COURIERS; });
        const r = await p.checkServiceability(ADDR(''), ADDR(''));
        assert.equal(r.ok, false);
        assert.match(r.reason, /pincode/i);
        assert.equal(called, false, 'should not have hit the API');
    });

    test('requestPickup runs create → serviceability → awb → pickup', async () => {
        const seen = [];
        const p = withTransport(async (cfg) => {
            seen.push(cfg.url);
            if (cfg.url.includes('/orders/create')) return { data: { shipment_id: 555, order_id: 777 } };
            if (cfg.url.includes('serviceability')) return COURIERS;
            if (cfg.url.includes('assign/awb')) return { data: { response: { data: { awb_code: 'AWB123' } } } };
            if (cfg.url.includes('generate/pickup')) return { data: { response: { pickup_token_number: 'PT-9' } } };
            throw new Error(`unexpected call ${cfg.url}`);
        });

        const r = await p.requestPickup({
            referenceId: '#ON-1', leg: 'RETURN', from: ADDR('452001'), to: ADDR('452010'), declaredValue: 500
        });

        assert.equal(r.ok, true);
        assert.equal(r.taskId, '555');
        assert.equal(r.trackingRef, 'AWB123');
        assert.equal(r.providerOrderId, '777');
        assert.equal(r.pickupToken, 'PT-9');
        assert.deepEqual(seen.map(u => u.split('?')[0]), [
            '/orders/create/adhoc', '/courier/serviceability/', '/courier/assign/awb', '/courier/generate/pickup'
        ]);
    });

    test('the PICKUP leg is booked as a REVERSE shipment', async () => {
        const seen = [];
        const p = withTransport(async (cfg) => {
            seen.push(cfg.url);
            if (cfg.url.includes('/orders/create')) return { data: { shipment_id: 1, order_id: 2 } };
            if (cfg.url.includes('serviceability')) return COURIERS;
            if (cfg.url.includes('assign/awb')) return { data: { awb_code: 'A' } };
            return { data: {} };
        });

        await p.requestPickup({ referenceId: '#ON-2', leg: 'PICKUP', from: ADDR('452001'), to: ADDR('452010') });
        assert.ok(seen[0].includes('/orders/create/return'), `expected a reverse order, got ${seen[0]}`);
    });

    test('a booking without an AWB is reported as failed', async () => {
        const p = withTransport(async (cfg) => {
            if (cfg.url.includes('/orders/create')) return { data: { shipment_id: 1, order_id: 2 } };
            if (cfg.url.includes('serviceability')) return COURIERS;
            if (cfg.url.includes('assign/awb')) return { data: {} };   // no awb
            return { data: {} };
        });
        const r = await p.requestPickup({ referenceId: 'x', leg: 'RETURN', from: ADDR('1'), to: ADDR('2') });
        assert.equal(r.ok, false);
        assert.match(r.reason, /awb/i);
    });

    test('a failed pickup request still yields a successful booking', async () => {
        // The shipment exists and has an AWB; ops can re-request the pickup.
        const p = withTransport(async (cfg) => {
            if (cfg.url.includes('/orders/create')) return { data: { shipment_id: 9, order_id: 8 } };
            if (cfg.url.includes('serviceability')) return COURIERS;
            if (cfg.url.includes('assign/awb')) return { data: { awb_code: 'AWB9' } };
            throw new Error('pickup endpoint down');
        });
        const r = await p.requestPickup({ referenceId: 'x', leg: 'RETURN', from: ADDR('1'), to: ADDR('2') });
        assert.equal(r.ok, true);
        assert.equal(r.trackingRef, 'AWB9');
    });

    test('an upstream error is returned, never thrown', async () => {
        const p = withTransport(async () => {
            const e = new Error('boom');
            e.response = { status: 500, data: { message: 'server error' } };
            throw e;
        });
        const r = await p.requestPickup({ referenceId: 'x', leg: 'RETURN', from: ADDR('1'), to: ADDR('2') });
        assert.equal(r.ok, false);
        assert.match(r.reason, /Shiprocket 500/);
    });

    test('cancelTask posts the provider order id', async () => {
        let body;
        const p = withTransport(async (cfg) => { body = cfg.data; return { data: {} }; });
        const r = await p.cancelTask('777');
        assert.equal(r.ok, true);
        assert.deepEqual(body, { ids: ['777'] });
    });

    test('cancelTask refuses without an id', async () => {
        const p = withTransport(async () => ({ data: {} }));
        assert.equal((await p.cancelTask()).ok, false);
    });

    test('getStatus tracks by AWB and maps the status', async () => {
        let url;
        const p = withTransport(async (cfg) => {
            url = cfg.url;
            return { data: { tracking_data: { shipment_track: [{ current_status: 'DELIVERED', courier_name: 'Quick' }] } } };
        });
        const r = await p.getStatus('AWB123');
        assert.equal(r.ok, true);
        assert.equal(r.status, DeliveryStatus.DELIVERED);
        assert.match(url, /\/courier\/track\/awb\/AWB123$/);
    });

    test('getStatus refuses without a tracking reference', async () => {
        const p = withTransport(async () => ({ data: {} }));
        assert.equal((await p.getStatus()).ok, false);
    });
});

describe('ShiprocketQuickProvider — webhook mapping', () => {
    const p = new ShiprocketQuickProvider({ email: 'a@b.c', password: 'pw' });

    test('maps provider statuses onto our canonical set', () => {
        const cases = [
            ['RIDER_ASSIGNED', DeliveryStatus.PARTNER_ASSIGNED],
            ['PICKED_UP', DeliveryStatus.PICKED_UP],
            ['OUT_FOR_DELIVERY', DeliveryStatus.IN_TRANSIT],
            ['DELIVERED', DeliveryStatus.DELIVERED],
            ['CANCELLED', DeliveryStatus.CANCELLED],
            ['RTO', DeliveryStatus.FAILED]
        ];
        for (const [raw, expected] of cases) {
            const r = p.parseWebhook({ order_id: '#ON-1', status: raw });
            assert.equal(r.ok, true, `${raw} should map`);
            assert.equal(r.status, expected);
        }
    });

    test('is case-insensitive on the provider status', () => {
        assert.equal(p.parseWebhook({ order_id: 'x', status: 'delivered' }).status, DeliveryStatus.DELIVERED);
    });

    test('reports an unmapped status instead of guessing', () => {
        const r = p.parseWebhook({ order_id: 'x', status: 'TELEPORTED' });
        assert.equal(r.ok, false);
        assert.match(r.reason, /unmapped/i);
    });

    test('rejects an empty payload', () => {
        assert.equal(p.parseWebhook(null).ok, false);
    });

    test('accepts either reference id or task id', () => {
        assert.equal(p.parseWebhook({ task_id: 'T1', status: 'DELIVERED' }).ok, true);
        assert.equal(p.parseWebhook({ status: 'DELIVERED' }).ok, false);
    });

    test('extracts the delivery partner when present', () => {
        const r = p.parseWebhook({ order_id: 'x', status: 'DELIVERED', rider: { name: 'A', phone: '9' } });
        assert.equal(r.partner.name, 'A');
    });
});
