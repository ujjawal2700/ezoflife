/**
 * Contract sweep — covers EVERY registered endpoint.
 *
 * The manifest is derived from the source, so a newly added route is picked up
 * automatically and must satisfy these invariants without anyone writing a test:
 *
 *   1. REGISTERED   — the route resolves; a typo'd mount is caught immediately.
 *   2. GUARDED      — anything behind verifyAdmin/verifyAdminOrVendor rejects
 *                     anonymous callers with 401/403, never data.
 *   3. NO 5xx       — bad or missing input yields a 4xx, not a server fault.
 *                     (This is the class of bug that made a malformed
 *                     customerId return 500 instead of 400.)
 *
 * Requests are anonymous and use placeholder ids, so the sweep observes rather
 * than mutates. Depth lives in the dedicated suites.
 */
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { startTestEnvironment, api } from '../helpers/testEnvironment.js';
import { buildRouteManifest, concretePath } from '../helpers/routeManifest.js';

let env;
const manifest = buildRouteManifest();

before(async () => { env = await startTestEnvironment(); }, { timeout: 90000 });
after(async () => { if (env) await env.stop(); });

/** Express returns an HTML 404 when no route matches at all. */
const isUnroutedResponse = (res) =>
    res.status === 404 &&
    typeof res.body === 'string' &&
    /Cannot (GET|POST|PUT|PATCH|DELETE)/i.test(res.body);

const call = (e) =>
    api(env.baseUrl, concretePath(e.path), {
        method: e.method,
        // Send an empty object on mutating verbs so body parsing is exercised.
        body: e.method === 'GET' || e.method === 'DELETE' ? undefined : {}
    });

describe(`every endpoint is registered (${manifest.length} routes)`, () => {
    for (const e of manifest) {
        test(`${e.method} ${e.path}`, async () => {
            const res = await call(e);
            assert.ok(
                !isUnroutedResponse(res),
                `route not registered — Express had no handler for ${e.method} ${e.path}`
            );
        });
    }
});

describe('no endpoint returns a 5xx for empty or placeholder input', () => {
    for (const e of manifest) {
        test(`${e.method} ${e.path}`, async () => {
            const res = await call(e);
            assert.ok(
                res.status < 500,
                `${e.method} ${e.path} returned ${res.status} — bad input must yield 4xx, not a server fault. ` +
                `Body: ${JSON.stringify(res.body).slice(0, 200)}`
            );
        });
    }
});

describe('guarded endpoints reject anonymous callers', () => {
    const guarded = manifest.filter(e => e.guarded);

    test(`manifest identifies guarded routes (${guarded.length} of ${manifest.length})`, () => {
        assert.ok(guarded.length > 0, 'no guarded routes detected — the parser is likely broken');
    });

    for (const e of guarded) {
        test(`${e.method} ${e.path} requires auth`, async () => {
            const res = await call(e);
            assert.ok(
                res.status === 401 || res.status === 403,
                `${e.method} ${e.path} answered ${res.status} to an anonymous caller; expected 401/403`
            );
        });
    }
});

describe('guarded endpoints never leak a payload to anonymous callers', () => {
    for (const e of manifest.filter(e => e.guarded && e.method === 'GET')) {
        test(`${e.method} ${e.path} returns no data`, async () => {
            const res = await call(e);
            const body = JSON.stringify(res.body ?? '');
            // A rejection carries a message, not records.
            assert.ok(
                body.length < 400 && !/\[\s*{/.test(body),
                `${e.path} appears to have returned a collection to an anonymous caller`
            );
        });
    }
});
