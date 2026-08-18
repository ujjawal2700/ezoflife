# WhatsApp OTP

WhatsApp is the platform's **only** OTP delivery channel — there is no SMS
fallback, by design. Every login and signup flow across all four portals goes
through this module.

## Design

Same port/adapter shape as `services/logistics/`:

```
WhatsAppProvider (interface)
├── MockWhatsAppProvider       demo — logs the OTP, always succeeds
└── MetaCloudApiProvider       live — WhatsApp Business Platform (Cloud API)
```

`authController.js` never talks to axios or WhatsApp directly — it asks the
selected provider to `sendOtp(phone, otp)` and gets back `{ ok, reason? }`.

## Current status: demo mode, by design

There is no WhatsApp Business account configured yet. Until there is:

- `WHATSAPP_ENABLED` is unset → the **mock** provider is always selected
- **The OTP is the fixed demo value `123456`** for every account (see
  `generateOTP()` in `authController.js`) — there is no way to prove real
  delivery without a live account, so a fixed code keeps the whole app usable
  and testable
- Requesting an OTP logs it to the server console instead of sending anything

**Nothing needs to change in the app to go live** — only configuration. See
below.

## Going live

1. **Get a WhatsApp Business Platform account.** Either direct with Meta
   (Cloud API) or through a BSP (Twilio, 360dialog, Gupshup, Interakt,
   MSG91...). A BSP is usually faster to onboard with in India.
2. **Get an OTP template approved in the Authentication category.** Not
   Utility, not Marketing — using the wrong category risks rejection and
   costs more per message. A minimal template body looks like:
   > Your Spinzyt verification code is `{{1}}`. Valid for 10 minutes.
3. **Set these in `backend/.env`:**

   | Variable | Required | Purpose |
   |---|---|---|
   | `WHATSAPP_ENABLED` | yes | `true` selects the live provider |
   | `WHATSAPP_PHONE_NUMBER_ID` | yes | from the Meta/BSP dashboard |
   | `WHATSAPP_ACCESS_TOKEN` | yes | permanent system-user token (Meta) or BSP API key |
   | `WHATSAPP_OTP_TEMPLATE_NAME` | yes | the exact approved template name |
   | `WHATSAPP_OTP_TEMPLATE_LANG` | no | default `en_US` |
   | `WHATSAPP_OTP_TEMPLATE_HAS_BUTTON` | no | default `true` — Meta's standard auth templates ship a "Copy Code" button; set `false` if yours doesn't |
   | `WHATSAPP_API_BASE_URL` | no | default `https://graph.facebook.com/v20.0`; override for a BSP with a Cloud-API-compatible endpoint |

4. **Send yourself one real OTP before enabling it for users.** Log in with
   your own number in a staging environment and confirm the message arrives.

**Fail-safe selection:** if `WHATSAPP_ENABLED=true` but credentials are
missing, the mock provider is used and a warning is logged — a
half-configured deployment sends nothing rather than crashing requests.

**OTP becomes random the moment the live provider is selected** — the fixed
`123456` only applies while running on the mock provider.

## ⚠️ Verify before going live

1. The template name/language must exactly match what Meta approved for your
   account — a mismatch is rejected at send time.
2. Confirm whether your approved template has a "Copy Code" button component;
   if not, set `WHATSAPP_OTP_TEMPLATE_HAS_BUTTON=false`.
3. If your BSP has its own proprietary API shape rather than proxying the
   Cloud API HTTP format, `MetaCloudApiProvider.js` is the one file that
   needs rewriting — nothing else in the app depends on its internals.

## Tests

```bash
npm run test:unit   # provider selection, phone normalisation, template payload, error handling
```

All tests run against the mock provider or a stubbed transport; nothing ever
sends a real WhatsApp message during a test run.
