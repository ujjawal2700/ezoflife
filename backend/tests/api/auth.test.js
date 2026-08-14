/**
 * Authentication / OTP flow.
 *
 * The OTP is deliberately hardcoded to '123456' during development. These tests
 * assert the surrounding flow (issue, verify, reject, token shape) so that
 * swapping in a real SMS/WhatsApp gateway is a contained change — only the
 * "development OTP" test below should need editing.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { startTestEnvironment, api } from '../helpers/testEnvironment.js';

let env;

before(async () => { env = await startTestEnvironment(); }, { timeout: 90000 });
after(async () => { if (env) await env.stop(); });

const requestOtp = (phone, role = 'Customer') =>
    api(env.baseUrl, '/api/auth/request-otp', { method: 'POST', body: { phone, role, channel: 'SMS' } });

const verifyOtp = (phone, otp) =>
    api(env.baseUrl, '/api/auth/verify-otp', { method: 'POST', body: { phone, otp } });

describe('OTP issuance', () => {
    test('issues an OTP for a new customer', async () => {
        const res = await requestOtp('9991110001');
        assert.equal(res.status, 200);
        assert.match(res.body.message, /sent/i);
    });

    test('never returns the OTP in the response body', async () => {
        const res = await requestOtp('9991110002');
        const serialized = JSON.stringify(res.body);
        assert.doesNotMatch(serialized, /123456/,
            'the OTP must never be leaked to the client');
    });

    test('rejects a request with no phone number', async () => {
        const res = await api(env.baseUrl, '/api/auth/request-otp', { method: 'POST', body: {} });
        assert.ok(res.status >= 400, `expected an error, got ${res.status}`);
    });
});

describe('OTP verification', () => {
    test('accepts the development OTP and returns a JWT', async () => {
        // When a real gateway is wired up, this is the test to change.
        await requestOtp('9991110003');
        const res = await verifyOtp('9991110003', '123456');
        assert.equal(res.status, 200);
        assert.ok(res.body.token, 'a token should be returned');
    });

    test('rejects an incorrect OTP', async () => {
        await requestOtp('9991110004');
        const res = await verifyOtp('9991110004', '000000');
        assert.equal(res.status, 401);
    });

    test('rejects verification for an unknown phone number', async () => {
        const res = await verifyOtp('9999999999', '123456');
        assert.ok(res.status >= 400);
    });

    test('rejects a request missing the otp field', async () => {
        const res = await api(env.baseUrl, '/api/auth/verify-otp', {
            method: 'POST', body: { phone: '9991110003' }
        });
        assert.equal(res.status, 400);
    });
});

describe('issued tokens', () => {
    test('the token carries the user id and role, and is signed', async () => {
        await requestOtp('9991110005');
        const res = await verifyOtp('9991110005', '123456');
        const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET || 'test_secret_key');
        assert.ok(decoded.id);
        assert.equal(decoded.role, 'Customer');
    });

    test('the token expires rather than living forever', async () => {
        await requestOtp('9991110006');
        const res = await verifyOtp('9991110006', '123456');
        const decoded = jwt.decode(res.body.token);
        assert.ok(decoded.exp, 'token must carry an exp claim');
        assert.ok(decoded.exp > Math.floor(Date.now() / 1000), 'token should not be pre-expired');
    });

    test('a password/OTP field is never echoed back on the user object', async () => {
        await requestOtp('9991110007');
        const res = await verifyOtp('9991110007', '123456');
        const serialized = JSON.stringify(res.body.user || {});
        assert.doesNotMatch(serialized, /"otp"\s*:\s*"1234/,
            'the stored OTP must not be returned to the client');
    });
});
