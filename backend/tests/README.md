# Backend Test Suite

87 automated tests covering unit logic, API behaviour, security, concurrency,
load, stress and volume. Browser E2E lives in `frontend/e2e/`.

## Running

```bash
npm test              # unit + API (87 tests, ~15s)
npm run test:unit     # pure logic, no database (36 tests, <1s)
npm run test:api      # full-stack API tests (51 tests, ~12s)
npm run test:watch    # re-run unit tests on change

npm run test:load        # sustained read load
npm run test:load:write  # sustained write load
npm run test:volume      # bulk insert + read degradation
npm run test:stress      # ramp concurrency to find the saturation knee
npm run test:perf        # all performance scenarios
```

## Safety: tests never touch production

Every test that needs a database spins up its **own throwaway `mongod`** on a
random port with a temporary data directory, then boots the real `server.js`
against it as a child process. The Atlas cluster in `.env` is never contacted.
Teardown kills both processes and deletes the temp directory.

This is handled by `tests/helpers/testEnvironment.js` — if you add a suite, use
`startTestEnvironment()` and you inherit the isolation automatically.

Requires `mongod` on your PATH (`brew install mongodb-community`).

The load harness can be pointed at an already-running server:

```bash
TARGET_URL=http://localhost:5001 npm run test:load
```

⚠️ Only ever aim that at a staging environment.

## Layout

```
tests/
  helpers/
    testEnvironment.js   throwaway mongod + real server, plus an `api()` fetch helper
    factories.js         request payloads and token/user factories
  unit/                  pure functions, no I/O
    pricingEngine.test.js
    timeUtils.test.js
    paymentVerification.test.js
  api/                   full request/response against the real server
    paymentSecurity.test.js
    authorization.test.js
    auth.test.js
    orderLifecycle.test.js
    concurrency.test.js
  load/
    loadTest.js          load + volume harness (dependency-free)
```

## What each suite protects

| Suite | Guards against |
|---|---|
| `pricingEngine` | Drift in the multiplicative pricing formula, GST, express surcharge, logistics-fee placement |
| `timeUtils` | Malformed slot strings producing an Invalid Date and 500ing order creation |
| `paymentVerification` | Forged, replayed, or wrongly-signed payments; failing **open** when gateway keys are missing |
| `paymentSecurity` | A client declaring its own `paymentStatus`; unbacked discounts; client-supplied totals; wallet being debited on a failed payment |
| `authorization` | Non-admins deleting orders; admin route groups accepting the wrong role |
| `auth` | OTP leaking in responses; unsigned/never-expiring tokens |
| `orderLifecycle` | Order identifiers, status transitions, price breakdown, input validation |
| `concurrency` | Order-number collisions under simultaneous writes |

## Testing choices

**`node:test`, not Jest/Vitest.** Node's built-in runner needs no install and
supports everything used here, so the backend carries no test-framework
dependency. (The frontend does use Vitest — npm could not resolve it, but pnpm
can; see `frontend/e2e/README.md`.)

**API tests run with `--test-concurrency=1`.** Each suite boots its own mongod;
running them in parallel spawns several databases at once and makes failures
hard to read.

## Endpoint coverage — 100%

All **261 registered endpoints** are exercised, verified by capturing real
request traffic during a run:

```bash
ROUTE_LOG=/tmp/routes.log npm test
```

`tests/api/contract.test.js` derives the endpoint list from `server.js` and the
route files at test time, so **a newly added route is covered automatically**.
Every endpoint must satisfy four invariants:

1. **Registered** — the route resolves (a typo'd mount fails immediately)
2. **No 5xx** — bad or missing input yields a 4xx, never a server fault
3. **Guarded** — anything behind `verifyAdmin`/`verifyAdminOrVendor` rejects
   anonymous callers with 401/403
4. **No leak** — a guarded GET returns a message to an anonymous caller, not records

This is *contract* coverage: it proves every endpoint is reachable, correctly
guarded and crash-free. Deep behavioural coverage (business rules, state
transitions) exists for orders, payments and auth — see the suite table above —
and is still thin elsewhere.

## Known gaps, deliberately encoded

`authorization.test.js` contains a `KNOWN GAPS` block asserting the **current**
unauthenticated behaviour of order creation and status updates, each marked
`TODO(security)`. These pass today. When those routes are secured, the tests
will fail — that failure is the reminder to flip the assertion to expect
401/403. They are not a statement that the current behaviour is correct.

## Not covered

- **Shiprocket** — the service is a mock, so there is nothing meaningful to test
  until the real integration lands.
- **Pagination limits** — `getMyOrders` returns every order unbounded (see below).

## Performance findings

Measured on a local throwaway database — treat as relative, not production numbers.

| Scenario | Result |
|---|---|
| Read load (`GET /api/services`, 20 concurrent) | ~6,400 req/s, p95 5ms, 0 errors |
| Write load (`POST /api/orders`, 15 concurrent) | ~620 req/s, p95 29ms, 0 errors |
| Volume (1,500 orders) | insert ~450/s |
| Stress ramp (write path) | saturates at **~5 concurrent**, ~700 req/s |

### Saturation knee

`npm run test:stress` ramps concurrency and reports where throughput stops
growing. On an 8-core M3 the write path behaves like this:

| concurrency | req/s | p50 | p95 |
|---|---|---|---|
| 1 | 233 | 4ms | 5ms |
| 5 | 683 | 7ms | 9ms |
| 10 | 708 | 14ms | 17ms |
| 20 | 732 | 27ms | 32ms |
| 40 | 738 | 53ms | 63ms |

Throughput plateaus around 700 req/s at ~5 concurrent; past that, latency grows
linearly while throughput does not. That is a single Node process saturating its
event loop — the lever is horizontal scaling (more instances behind a balancer),
not tuning.

### SLO gate

Runs fail when budgets are breached, so this works as a regression gate rather
than a vanity benchmark:

```bash
SLO_P95_READ_MS=50 SLO_P95_WRITE_MS=250 SLO_ERROR_RATE=0.01 npm run test:perf
```

Defaults: p95 read 100ms, p95 write 500ms, error rate 5%.

### These are not production capacity numbers

The app and database share one host over loopback — no network latency, no TLS,
no connection-pool contention, and no other tenants. Use them to detect
regressions between runs on the same machine. For real sizing, run against
staging with production-shaped data:

```bash
TARGET_URL=https://staging.example.com npm run test:stress
```

**Open issue — unbounded response payload.** `GET /api/orders/my` returns every
order a customer has ever placed, with no pagination:

| Orders | Response | Latency |
|---|---|---|
| 200 | 351 KB | 36ms |
| 600 | 1.05 MB | 67ms |
| 1,200 | 2.11 MB | 130ms |

Growth is linear in payload size, not query time — indexes do not fix it.
Pagination (`?page=&limit=`) is the fix, and it is a breaking API change that
needs matching frontend work, so it has not been made here.
