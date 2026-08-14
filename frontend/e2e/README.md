# End-to-End Tests

25 browser tests driving the real application: a throwaway MongoDB, the real
backend, the Vite dev server, and Chromium.

## Running

```bash
npm run test:e2e            # all specs, headless
npm run test:e2e:headed     # watch it in a visible browser
npm run test:e2e:ui         # Playwright's interactive UI mode
npm run test:e2e:report     # open the HTML report after a run
npm run test:e2e:install    # (re)download the Chromium binary
```

Prerequisites: `mongod` on PATH, and Chromium installed via
`npm run test:e2e:install`.

## Safety

`e2e/globalSetup.js` starts the whole stack on fixed local ports:

| Service | Port | Database |
|---|---|---|
| mongod | 27099 | `ezoflife_e2e` (temp dir, deleted on teardown) |
| backend | 5099 | — |
| vite | 5199 | — |

The backend is launched with `MONGODB_URI` pointing at the local mongod, so the
Atlas cluster in `backend/.env` is never contacted. Teardown kills all three
processes and removes the temp data directory.

Ports are fixed rather than random because Playwright resolves `use.baseURL`
from the config at load time, before `globalSetup` runs. Override with
`E2E_WEB_PORT` / `E2E_API_PORT` / `E2E_MONGO_PORT` if they clash locally.

## Specs

| Spec | Covers |
|---|---|
| `smoke.spec.js` | App mounts, root redirects into `/user`, browser reaches the API, all four persona entry points render without uncaught errors |
| `customerAuth.spec.js` | Phone input constraints, auto-request of OTP at 10 digits, full login landing past the auth wall |
| `googleMaps.spec.js` | Loader-conflict regression, SDK + libraries load, in-browser reverse geocoding, no CORS-blocked REST calls |
| `admin.access.spec.js` | Logged-out redirects on every protected route, and that a forged localStorage flag still gets 401 from the API |
| `checkout.spec.js` | Razorpay stubbed via `addInitScript`; a forged payment response never yields a paid order; COD stays Pending |
| `vendorSupplier.spec.js` | All 12 vendor and 9 supplier screens render without uncaught errors; cross-portal privilege isolation |

## Notes on the app's behaviour

**The login form has no submit button.** It fires `handleRequestOtp`
automatically once 10 valid digits are entered. Clicking anything after filling
the field will hit the Login/Signup tabs instead — that is what made the first
version of the login test fail.

**Specs pre-create accounts via the API** (`registerCustomer`) rather than
driving the Signup tab, so auth journeys do not depend on signup form details.

**The Google Maps specs skip when `VITE_GOOGLE_MAPS_API_KEY` is absent** rather
than failing, so a CI environment without secrets stays green. They read the key
from `frontend/.env` directly, because `import.meta.env` is not available inside
`page.evaluate`.

## Razorpay

Razorpay's checkout is an external iframe. Driving it would test their UI and be
flaky, so `window.Razorpay` is replaced via `page.addInitScript` with a stub that
invokes the app's own success handler with a controlled response. That keeps the
assertion on our code: a payment the server cannot verify must never produce a
paid order.

Test-mode card automation against the real Razorpay iframe is still not covered.

## Not covered

- Visual regression / screenshot diffing
- Firefox and WebKit (only Chromium is installed)
- The full add-to-cart → checkout click path (the cart is seeded via localStorage)
