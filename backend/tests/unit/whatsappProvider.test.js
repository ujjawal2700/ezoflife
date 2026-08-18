/**
 * WhatsApp provider selection and the Meta Cloud API transport.
 *
 * WhatsApp is the only OTP channel — no SMS fallback. These tests cover the
 * two things that must never regress:
 *   1. Selection fails SAFE — a half-configured deployment must fall back to
 *      the demo provider, never half-attempt a live send.
 *   2. The demo OTP ('123456') is only used while the mock provider is
 *      selected; it must become random the moment a live provider is active.
 */
import { test, describe, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

import {
    getWhatsAppProvider,
    resetWhatsAppProvider,
    isWhatsAppLive,
    MockWhatsAppProvider,
    MetaCloudApiProvider
} from '../../src/services/whatsapp/index.js';

const ENV_KEYS = ['WHATSAPP_ENABLED', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_ACCESS_TOKEN'];
let saved;

beforeEach(() => {
    saved = Object.fromEntries(ENV_KEYS.map(k => [k, process.env[k]]));
    for (const k of ENV_KEYS) delete process.env[k];
    resetWhatsAppProvider();
});

afterEach(() => {
    for (const [k, v] of Object.entries(saved)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
    resetWhatsAppProvider();
    mock.restoreAll();
});

describe('provider selection', () => {
    test('defaults to the mock when WHATSAPP_ENABLED is unset', () => {
        assert.equal(getWhatsAppProvider().name, 'mock');
        assert.equal(isWhatsAppLive(), false);
    });

    test('stays on the mock when explicitly disabled', () => {
        process.env.WHATSAPP_ENABLED = 'false';
        assert.equal(getWhatsAppProvider().name, 'mock');
    });

    test('falls back to the mock when enabled but credentials are missing', () => {
        process.env.WHATSAPP_ENABLED = 'true';
        // A half-configured deployment must not attempt a live send.
        assert.equal(getWhatsAppProvider().name, 'mock');
    });

    test('falls back to the mock when only one credential is set', () => {
        process.env.WHATSAPP_ENABLED = 'true';
        process.env.WHATSAPP_PHONE_NUMBER_ID = 'pnid';
        assert.equal(getWhatsAppProvider().name, 'mock');
    });

    test('uses the live provider only when enabled AND fully configured', () => {
        process.env.WHATSAPP_ENABLED = 'true';
        process.env.WHATSAPP_PHONE_NUMBER_ID = 'pnid';
        process.env.WHATSAPP_ACCESS_TOKEN = 'token';
        assert.equal(getWhatsAppProvider().name, 'whatsapp-meta-cloud-api');
        assert.equal(isWhatsAppLive(), true);
    });

    test('is memoised across calls', () => {
        assert.equal(getWhatsAppProvider(), getWhatsAppProvider());
    });

    test('refresh re-evaluates the environment', () => {
        const first = getWhatsAppProvider();
        process.env.WHATSAPP_ENABLED = 'true';
        process.env.WHATSAPP_PHONE_NUMBER_ID = 'pnid';
        process.env.WHATSAPP_ACCESS_TOKEN = 'token';
        const second = getWhatsAppProvider({ refresh: true });
        assert.notEqual(first.name, second.name);
    });
});

describe('MockWhatsAppProvider', () => {
    const p = new MockWhatsAppProvider();

    test('always succeeds in demo mode', async () => {
        const r = await p.sendOtp('9876543210', '123456');
        assert.equal(r.ok, true);
        assert.equal(r.mode, 'demo');
    });

    test('never throws, never calls the network', async () => {
        const spy = mock.method(axios, 'post', () => { throw new Error('should not be called'); });
        await p.sendOtp('9876543210', '123456');
        assert.equal(spy.mock.callCount(), 0);
    });
});

describe('MetaCloudApiProvider — configuration', () => {
    test('isConfigured is false without credentials', () => {
        const p = new MetaCloudApiProvider({ phoneNumberId: '', accessToken: '' });
        assert.equal(p.isConfigured, false);
    });

    test('isConfigured is true once both are set', () => {
        const p = new MetaCloudApiProvider({ phoneNumberId: 'pnid', accessToken: 'tok' });
        assert.equal(p.isConfigured, true);
    });

    test('refuses to send without configuration, never throws', async () => {
        const p = new MetaCloudApiProvider({ phoneNumberId: '', accessToken: '' });
        const r = await p.sendOtp('9876543210', '123456');
        assert.equal(r.ok, false);
        assert.match(r.reason, /WHATSAPP_PHONE_NUMBER_ID|WHATSAPP_ACCESS_TOKEN/);
    });
});

describe('MetaCloudApiProvider — phone number handling', () => {
    const make = () => new MetaCloudApiProvider({ phoneNumberId: 'pnid', accessToken: 'tok' });

    test('a bare 10-digit number is prefixed with 91', async () => {
        let sentTo;
        mock.method(axios, 'post', async (_url, body) => { sentTo = body.to; return { data: {} }; });
        await make().sendOtp('9876543210', '123456');
        assert.equal(sentTo, '919876543210');
    });

    test('an already-prefixed 12-digit number is left alone', async () => {
        let sentTo;
        mock.method(axios, 'post', async (_url, body) => { sentTo = body.to; return { data: {} }; });
        await make().sendOtp('919876543210', '123456');
        assert.equal(sentTo, '919876543210');
    });

    test('rejects an obviously invalid number without calling the API', async () => {
        const spy = mock.method(axios, 'post', async () => ({ data: {} }));
        const r = await make().sendOtp('123', '123456');
        assert.equal(r.ok, false);
        assert.equal(spy.mock.callCount(), 0);
    });
});

describe('MetaCloudApiProvider — request shape', () => {
    const make = (overrides) => new MetaCloudApiProvider({
        phoneNumberId: 'pnid', accessToken: 'tok', ...overrides
    });

    test('posts to {baseUrl}/{phoneNumberId}/messages', async () => {
        let url;
        mock.method(axios, 'post', async (u) => { url = u; return { data: {} }; });
        await make().sendOtp('9876543210', '123456');
        assert.match(url, /\/pnid\/messages$/);
    });

    test('sends the auth header as a Bearer token', async () => {
        let headers;
        mock.method(axios, 'post', async (_u, _b, cfg) => { headers = cfg.headers; return { data: {} }; });
        await make().sendOtp('9876543210', '123456');
        assert.equal(headers.Authorization, 'Bearer tok');
    });

    test('uses a template message carrying the OTP in the body', async () => {
        let body;
        mock.method(axios, 'post', async (_u, b) => { body = b; return { data: {} }; });
        await make({ templateName: 'otp_login', templateLang: 'en_US' }).sendOtp('9876543210', '482913');

        assert.equal(body.type, 'template');
        assert.equal(body.template.name, 'otp_login');
        assert.equal(body.template.language.code, 'en_US');
        const bodyComponent = body.template.components.find(c => c.type === 'body');
        assert.equal(bodyComponent.parameters[0].text, '482913');
    });

    test('includes a copy-code button component by default', async () => {
        let body;
        mock.method(axios, 'post', async (_u, b) => { body = b; return { data: {} }; });
        await make().sendOtp('9876543210', '482913');

        const button = body.template.components.find(c => c.type === 'button');
        assert.ok(button, 'expected a button component for the standard auth template');
        assert.equal(button.parameters[0].text, '482913');
    });

    test('omits the button component when the template has none', async () => {
        let body;
        mock.method(axios, 'post', async (_u, b) => { body = b; return { data: {} }; });
        await make({ templateHasButton: false }).sendOtp('9876543210', '482913');

        const button = body.template.components.find(c => c.type === 'button');
        assert.equal(button, undefined);
    });
});

describe('MetaCloudApiProvider — delivery outcome', () => {
    const make = () => new MetaCloudApiProvider({ phoneNumberId: 'pnid', accessToken: 'tok' });

    test('a successful send returns ok:true, mode:live', async () => {
        mock.method(axios, 'post', async () => ({ data: { messages: [{ id: 'wamid.abc' }] } }));
        const r = await make().sendOtp('9876543210', '123456');
        assert.equal(r.ok, true);
        assert.equal(r.mode, 'live');
    });

    test('an upstream error is returned, never thrown', async () => {
        mock.method(axios, 'post', async () => {
            const e = new Error('boom');
            e.response = { status: 401, data: { error: { message: 'Invalid OAuth token' } } };
            throw e;
        });
        const r = await make().sendOtp('9876543210', '123456');
        assert.equal(r.ok, false);
        assert.match(r.reason, /401/);
        assert.match(r.reason, /Invalid OAuth token/);
    });

    test('a network-level failure (no response) is still reported, not thrown', async () => {
        mock.method(axios, 'post', async () => { throw new Error('ECONNREFUSED'); });
        const r = await make().sendOtp('9876543210', '123456');
        assert.equal(r.ok, false);
        assert.match(r.reason, /ECONNREFUSED/);
    });
});
