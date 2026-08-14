/**
 * Route manifest.
 *
 * Derives every registered endpoint by parsing server.js and the route files,
 * rather than hard-coding a list. New routes are therefore covered by the
 * contract sweep automatically — if someone adds an endpoint without a test,
 * the sweep still asserts it is registered, guards its auth, and does not 500.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BACKEND_ROOT = fileURLToPath(new URL('../..', import.meta.url));

const stripComments = src => src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Middleware names that imply the route is protected. */
const GUARDS = ['verifyAdmin', 'verifyAdminOrVendor'];

export const buildRouteManifest = () => {
    const serverPath = path.join(BACKEND_ROOT, 'server.js');
    const server = stripComments(fs.readFileSync(serverPath, 'utf8'));

    // router variable -> route file
    const imports = {};
    for (const m of server.matchAll(/import\s+([A-Za-z0-9_]+)\s+from\s+['"`](\.\/src\/routes\/[^'"`]+)['"`]/g)) {
        imports[m[1]] = m[2];
    }

    const endpoints = [];

    // 1. routes declared directly on the app in server.js
    for (const m of server.matchAll(
        /app\.(get|post|put|patch|delete)\(\s*['"`](\/api\/[^'"`]*)['"`]\s*,([^)]*)\)/g
    )) {
        endpoints.push({
            method: m[1].toUpperCase(),
            path: m[2],
            guarded: GUARDS.some(g => m[3].includes(g)),
            source: 'server.js'
        });
    }

    // 2. mounted routers
    for (const m of server.matchAll(
        /app\.use\(\s*['"`](\/api\/[^'"`]*)['"`]\s*,\s*([A-Za-z0-9_]+\s*,\s*)?([A-Za-z0-9_]+)\s*\)/g
    )) {
        const mount = m[1];
        const mountGuard = (m[2] || '').trim().replace(/,$/, '');
        const varName = m[3];
        const file = imports[varName];
        if (!file) continue;

        const full = path.join(BACKEND_ROOT, file);
        if (!fs.existsSync(full)) continue;
        const src = stripComments(fs.readFileSync(full, 'utf8'));

        for (const r of src.matchAll(
            /router\.(get|post|put|patch|delete)\(\s*['"`]([^'"`]*)['"`]\s*,?([^)]*)/g
        )) {
            const sub = r[2] === '/' ? '' : r[2];
            endpoints.push({
                method: r[1].toUpperCase(),
                path: `${mount}${sub}`,
                guarded: GUARDS.includes(mountGuard) || GUARDS.some(g => (r[3] || '').includes(g)),
                source: file
            });
        }
    }

    // De-duplicate on method+path. Express matches in declaration order, so a
    // route declared directly on the app wins over a later mounted router —
    // that is how `GET /api/admin/config` is intentionally public even though
    // `/api/admin` as a whole is mounted behind verifyAdmin.
    const seen = new Map();
    for (const e of endpoints) {
        const key = `${e.method} ${e.path}`;
        const prev = seen.get(key);
        if (!prev) { seen.set(key, e); continue; }
        const prevIsDirect = prev.source === 'server.js';
        if (!prevIsDirect && e.source === 'server.js') seen.set(key, e);
        else if (!prevIsDirect && e.guarded && !prev.guarded) seen.set(key, e);
    }

    return [...seen.values()].sort((a, b) =>
        a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path)
    );
};

/** Fill :params with a syntactically valid ObjectId so routing resolves. */
const PLACEHOLDER_ID = '60000000000000000000000b';
export const concretePath = (p) =>
    p.replace(/:([A-Za-z0-9_]+)/g, (_, name) =>
        /id$/i.test(name) ? PLACEHOLDER_ID : 'test-value'
    );

/**
 * Endpoints excluded from the destructive sweep because calling them with a
 * valid admin token would wipe the shared fixture data mid-suite. They are
 * covered explicitly in destructive.test.js instead.
 */
export const BULK_DESTRUCTIVE = /clear-all|force-clear|delete-all|purge|reset/i;
