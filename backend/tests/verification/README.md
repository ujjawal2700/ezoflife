# GST business-rule verification

Four synthetic accounts have been added to the configured app database. Their GSTINs are test identifiers, not verified legal identities. Both vendors are approved, profile complete, colocated with the customers in Indore, and support the three currently active master services. No app orders, promotions, wallet balances, payment accounts, or tax settings were changed.

| Account | Phone | GST status |
| --- | --- | --- |
| Business customer | 9876510101 | RD, GSTIN 23ABCDE1234F1Z5 |
| Individual customer | 9876510102 | URD, no GSTIN |
| Registered vendor | 9876510103 | RD, GSTIN 23FGHIJ5678K1Z2 |
| Unregistered vendor | 9876510104 | URD, no GSTIN |

Use the normal customer/vendor login flow. Mock WhatsApp mode uses OTP `123456`; a live provider sends its generated OTP normally. The seed does not add an authentication bypass or send messages.

From `backend`:

```sh
npm run seed:gst-users -- --dry-run
npm run seed:gst-users
npm run verify:gst
```

The seed checks phone collisions before writing and only inserts missing demo users. It never overwrites existing accounts. The acceptance checks use a temporary local MongoDB and real backend API; they do not use the app database. They are a separate verification command so known business-rule failures do not masquerade as passing regression tests. A nonzero exit means the requested requirements are not fully implemented.

## Verified result

19 acceptance checks: **12 passed, 7 failed**. The existing GST helper suite also passes all 9 checks, demonstrating that those checks alone do not cover the requested rules.

Passing checks include distinct finalized invoice numbers for A/B/C; correct displayed GSTINs; normal URD-vendor pool filtering and rejection of RD-customer acceptance, direct viewing, and fulfillment; customer-only Invoice 1 access; denial for unrelated accounts; configured Invoice 2 tax rates; baseline ledger arithmetic; and the vendor promotion split with one-time wallet credit.

## Confirmed gaps

1. **Invoice 1 omits GST on platform/logistics fees.** With base service ₹200, platform ₹20, logistics ₹50, and an 18% configured service tax, A/B produce ₹36 GST and ₹306 total. The requested full-value calculation is ₹48.60 GST and ₹318.60 total. Changing the configured rate to 12% reproduces the omission: ₹24 actual versus ₹32.40 expected.
2. **URD/URD payment and invoice disagree.** Checkout stores a ₹306 order total, while Invoice 1 removes GST and totals ₹270. The payout ledger balances against the invoice, not the original customer order total. This needs reconciliation before settlement can be considered correct.
3. **Admins can see both invoices.** The invoice endpoint returns HTTP 200 for Admin, while the supplied rules permit only the owning customer/vendor for Invoice 1 and owning vendor for Invoice 2.
4. **Order-pool identity bypass.** A URD vendor can supply an RD vendor's ID in the `vendorId` query parameter and see RD business customer orders. Direct acceptance is still rejected. The pool must derive vendor identity from the authenticated session.
5. **Invoice 2 ignores the configured fixed platform fee when checkout supplies a percentage fee.** Updating `platform_fee_fixed` to ₹35 still generates a ₹20 platform fee in Invoice 2. The configured platform GST is applied to that wrong fee.

## Promotion and bank-routing limits

For a ₹100 vendor-funded promotion, Invoice 1 shows ₹50 wallet credit, Invoice 2 includes ₹50 Spinzyt share, and the wallet is credited once. The current ledger deducts both shares from the vendor: `vendor payout = Invoice 1 - Invoice 2 - wallet credit`, where Invoice 2 already includes Spinzyt's ₹50 share. This conserves the collected amount and funds the wallet, but adds a wallet deduction to the simple formula supplied for non-promotional orders.

These checks use COD orders and do not execute bank transfers. The inspected payout controller records a supplied transaction ID as a completed payout; it does not initiate the vendor/Spinzyt bank split. Real account routing is therefore not verified by these tests.

This change adds demo accounts, repeatable acceptance checks, and this report. It does not change the existing financial or access-control implementation.
