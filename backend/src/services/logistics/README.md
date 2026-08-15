# Logistics

Delivery fulfilment for both legs of a laundry job:

```
PICKUP leg : customer → vendor    (collect dirty laundry)
RETURN leg : vendor  → customer   (deliver clean laundry)
```

## Design

The app talks to a **port** (`LogisticsProvider`) expressed in our own domain —
"book a pickup from A to B" — not in any vendor's vocabulary. Providers are
swappable behind it:

```
LogisticsProvider (interface)
├── MockProvider              deterministic, no network — dev + all tests
└── ShiprocketQuickProvider   live hyperlocal delivery
```

`dispatch.js` owns the order-facing logic and, critically, **idempotency**.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `SHIPROCKET_ENABLED` | `false` | `true` selects the live provider. Anything else uses the mock. |
| `SHIPROCKET_EMAIL` | — | API user email (Panel → Settings → API → Create An API User) |
| `SHIPROCKET_PASSWORD` | — | API user password |
| `SHIPROCKET_CHANNEL_ID` | — | Channel id |
| `SHIPROCKET_PICKUP_LOCATION` | — | Registered pickup location nickname |
| `SHIPROCKET_BASE_URL` | `https://apiv2.shiprocket.in/v1/external` | Override for sandbox |
| `LOGISTICS_WEBHOOK_SECRET` | — | Shared secret for `POST /api/logistics/webhook` |
| `LOGISTICS_SCHEDULER` | `true` | `false` stops the cron loop entirely |
| `LOGISTICS_CRON` | `*/5 * * * *` | Scheduler frequency |

**Fail-safe selection:** if `SHIPROCKET_ENABLED=true` but credentials are
missing, the mock is used and a warning is logged. A misconfigured deployment
books nothing rather than half-attempting a live booking.

## Status: implemented against the documented Shiprocket API

Shiprocket publishes no separate specification for Quick, so this is built on the
**documented standard API** (`apiv2.shiprocket.in/v1/external`). For same-city
routes, hyperlocal partners surface through the ordinary `/courier/serviceability`
call when the account has them enabled — so this works unchanged if Quick rides
the standard surface.

| Call | Endpoint |
|---|---|
| Auth | `POST /auth/login` — token cached 9 days (240h documented validity) |
| Serviceability | `GET /courier/serviceability/` — picks the cheapest courier |
| Forward order | `POST /orders/create/adhoc` — RETURN leg (vendor → customer) |
| Reverse order | `POST /orders/create/return` — PICKUP leg (customer → vendor) |
| AWB | `POST /courier/assign/awb` |
| Pickup | `POST /courier/generate/pickup` |
| Cancel | `POST /orders/cancel` |
| Tracking | `GET /courier/track/awb/{awb}` |

A booking is four sequential calls: create → serviceability → assign AWB →
request pickup. A failed pickup request still returns a successful booking, since
the shipment exists and has an AWB; ops can re-request it.

### ⚠️ Verify before production

1. **`parseWebhook()` status strings are inferred, not observed.** Check them
   against one real callback payload and correct the mapping table.
2. **Package weight/dimensions are defaults** (`SHIPROCKET_DEFAULT_WEIGHT_KG=2`,
   30×30×20cm). Couriers price on weight — tune these to a typical load.
3. **If Shiprocket confirm Quick has its own API**, only this file changes;
   everything upstream is provider-agnostic.

## Idempotency

The scheduler runs every 5 minutes. Without a guard, a slow provider response
would book — and bill for — the same delivery repeatedly.

`dispatchLeg()` claims an order with a conditional update before calling the
provider:

```js
findOneAndUpdate(
  { _id, 'shipmentDetails.taskId': null, pickupStatus: { $ne: 'requested' } },
  { $set: { pickupStatus: 'requested' } }
)
```

Only one caller can win. On failure the claim is released so a later run retries;
on success `taskId` is set and every subsequent attempt short-circuits with
`{ ok: true, skipped: true }`.

Covered by `tests/api/logistics.test.js` — including five concurrent
mark-ready calls producing exactly one booking.

## Webhook

`POST /api/logistics/webhook`, authenticated by `LOGISTICS_WEBHOOK_SECRET`
(header `x-webhook-secret`, or `?secret=`). Configure the callback URL in
Shiprocket Panel → Settings → API → Configure.

It returns **200 for anything it safely received**, including payloads it cannot
map — providers retry on non-2xx and eventually disable a failing webhook. A bad
secret is the one case that returns 401.

If `LOGISTICS_WEBHOOK_SECRET` is unset the endpoint accepts unauthenticated
callbacks and logs a warning. **Set it in production** — the endpoint can move
order state.

## Tests

```bash
npm run test:unit   # provider selection, token caching, webhook mapping
npm run test:api    # dispatch, idempotency, webhook auth + state transitions
```

All tests run against `MockProvider`; nothing contacts a live courier.
