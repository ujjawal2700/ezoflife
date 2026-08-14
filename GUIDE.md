# Loondry Platform — Client Deliverable Guide

> **Platform Overview:** Loondry (Ez of Life) is a multi-persona on-demand laundry logistics platform serving Customers, Vendors (laundry shops), Admin (platform operations), and Suppliers (B2B laundry partners). Pickup and delivery are fulfilled by Shiprocket; the platform runs no delivery fleet of its own.
>
> **Frontend Stack:** React 19 + Vite, TailwindCSS v4, Framer Motion, Recharts, Zustand, React Router v7
>
> **Current Status:** All frontend screens are built and 127 of 155 are wired to the live backend. The backend (Express + MongoDB) is substantially complete. Remaining gaps are listed in §7.

---

## Table of Contents

1. [Customer (User) Portal](#1-customer-user-portal)
2. [Vendor Portal](#2-vendor-portal)
3. [Logistics & Delivery (Shiprocket)](#3-logistics--delivery-shiprocket)
4. [Admin Panel](#4-admin-panel)
5. [Supplier Portal](#5-supplier-portal)
6. [Cross-Platform Features](#6-cross-platform-features)
7. [Frontend Completeness Audit](#7-frontend-completeness-audit)
8. [Backend Integration Readiness](#8-backend-integration-readiness)

---

## 1. Customer (User) Portal

**Entry Point:** `/user` → Splash Screen → Auto-redirect based on session

The Customer Portal is a premium mobile-first interface designed for end consumers who want to book, track, and manage laundry services.

---

### 1.1 Authentication Flow

| Screen | Route | Description |
|--------|-------|-------------|
| Splash Screen | `/user` | 3-second branded splash with logo animation. Auto-redirects logged-in users to Home. |
| Auth (Login / Sign Up) | `/user/auth` | Unified screen with Login/Sign Up tabs. Phone number input with WhatsApp / SMS OTP channel toggle. Sign-Up includes mandatory T&C checkbox. |
| OTP Verification | `/user/otp` | 4/6-digit OTP entry with auto-focus, resend timer, and channel confirmation (WhatsApp or SMS). |
| Profile Creation | `/user/profile-creation` | One-time profile setup: Display Name + Home Address. Completes onboarding and routes to Home. |

---

### 1.2 Home Screen

- **Dual Service Tier Toggle** — `Essential` (standard services) and `Heritage` (premium care) tiers with distinct service catalogs.
- **Promo Banner Carousel** — Auto-sliding promotional banners (3 items, configurable).
- **Service Search Bar** — Fuzzy search that routes to `/user/search` with filtered results.
- **Service Category Chips** — Tap-to-filter categories (Wash & Fold, Dry Clean, Ironing, etc.).
- **Service Cards with Inline Quantity Controls** — Tap a card to activate it; `+/-` buttons appear inline for quantity selection. A floating **View Cart** summary bar appears at the bottom when ≥1 service is selected.

---

### 1.3 Cart & Checkout

| Feature | Description |
|---------|-------------|
| Cart Summary | Full list of selected services with quantities, sub-totals, and edit capability. |
| Express Toggle | One-tap `Express Delivery` toggle applies a **1.5× surcharge**. Total updates in real-time. |
| Price Breakdown | Transparent 4-line formula display: Base Rate + Aggregator Fee + Logistics Fee × Express Surcharge = Final Total. |
| Pickup/Drop-off Time Slots | Grid slot picker for both pickup and delivery — Morning / Afternoon / Evening options. |
| Pre-Pickup Photo Upload | Optional camera roll or file input for customers to capture garments before the delivery partner arrives. Thumbnail preview shown inline. |
| Address Selector | Picks from the saved address book or lets user add a new one inline. |
| Payment Method Selector | Chooses from saved payment methods or COD. |

---

### 1.4 Order Confirmation & Handshake Flow

The platform uses a **4-Step Logistics Handshake Protocol** clearly shown on every tracking screen.

```
STEP 1: Pickup      — Delivery partner arrives, Customer provides OTP-1 to confirm handover
STEP 2: Intake      — Partner delivers to Vendor; Vendor scans/confirms items
STEP 3: Processing  — Vendor completes laundry work; marks order "Ready"
STEP 4: Handover    — Return partner collects; Customer confirms final OTP at doorstep
```

| Screen | Route | Description |
|--------|-------|-------------|
| Order Confirmation | `/user/order-confirmation` | Final review of services, address, slot, and total. "Confirm Order" fires the platform-wide notification cascade. |
| Order Tracking | `/user/track/:id` | Live 4-step progress bar with step labels. Shows delivery partner ETA, current stage, and vendor name. |
| Delivery Verification | `/user/delivery-verification` | Displays pickup photos for verification. Customer enters **Final OTP** (Step 4). Auto-navigates to Payment on verification. |
| Payment | `/user/payment` | Payment method confirmation and order settlement screen. |

---

### 1.5 Post-Order Features

| Feature | Route | Description |
|---------|-------|-------------|
| Orders History | `/user/orders` | **Active** tab: live orders with status. **Past** tab: completed orders with "Reorder" button (auto-fills cart) and "Download Invoice" (browser print). |
| Rate & Review | `/user/rate-review` | 5-star rating + text review after delivery confirmation. |
| Wallet | `/user/wallet` | Balance display, credit history, and redeem loyalty points. |

---

### 1.6 Profile & Settings

| Feature | Route | Description |
|---------|-------|-------------|
| User Profile | `/user/profile` | Name, phone, tier status, edit button. |
| Address Book | `/user/addresses` | Full CRUD for saved addresses — Add, Edit, Delete, Set as Default. |
| Payment Methods | `/user/payment-methods` | Saved cards/UPI/COD management. |
| Notifications | `/user/notifications` | Live notification feed powered by the global store. Filters by persona. Unread badge updates in real-time. |
| More Menu | `/user/more` | App hub: Help, FAQ, Chat, Register as Vendor, T&C, Privacy Policy, Advertise With Us, Partnership Inquiry, Careers. |

---

### 1.7 Additional Pages

| Page | Description |
|------|-------------|
| FAQ | Frequently asked questions (expandable accordion). |
| Help Center | Support options with chat link and call options. |
| In-App Chat | Per-order ID chat interface with customer support. |
| Partnership Inquiry | B2B lead capture form (feeds Admin B2B Leads repository). |
| Advertise With Us | Brand advertising inquiry form. |
| Careers | Open positions information page. |
| Register as Vendor | Landing page with vendor benefits + "Apply Now" → routes to Vendor Registration. |
| Terms & Conditions | Full T&C document. |
| Privacy Policy | GDPR-aligned privacy document. |

---

## 2. Vendor Portal

**Entry Point:** `/vendor` → Vendor Splash → Vendor Dashboard (if authenticated)

The Vendor Portal is designed for laundry shop operators to manage incoming orders, services, promotions, and earnings.

---

### 2.1 Authentication & Onboarding

| Screen | Route | Description |
|--------|-------|-------------|
| Vendor Splash | `/vendor` | Branded splash for the Vendor persona. |
| Vendor Auth | `/vendor/auth` | Phone + OTP login / Registration start. |
| Shop Details | `/vendor/register/shop` | Shop name, address, GST number, working hours, service area setup. |
| Document Upload | `/vendor/register/docs` | Upload FSSAI, GST Certificate, PAN Card, and Shop Establishment docs. |
| Approval Pending | `/vendor/pending` | Holding screen shown while Admin reviews the application. Notified upon approval. |

---

### 2.2 Vendor Dashboard

The operational command center for the vendor.

- **Shop Status Toggle** — `Active / Resting` with real-time visual indicator.
- **Earnings Today** card — Daily revenue with % change vs. yesterday.
- **Process Queue Card** — Total live orders with how many are "Ready for Delivery."
- **Order Workflow Tabs** — Three tabs with **live order counts**:
  - `New` — Available incoming orders to accept.
  - `Active` — In-progress orders (being washed/ironed).
  - `Done` — Ready for pickup/dispatch orders.
- **Management Quick Links** — Walk-In, Promotions, and Supply shortcuts.

---

### 2.3 Order Management

| Screen | Route | Description |
|--------|-------|-------------|
| Order Details | `/vendor/order/:id` | Full order view: 4-step handshake progress bar, customer info, item list with prices, special instructions, "Mark as Ready" action. |
| Walk-In Order | `/vendor/walk-in` | Manual order creation terminal for customers who physically visit the shop. |

**"Mark as Ready" Action:** When triggered, fires real-time notifications to:
- **Customer** → "Cleaning Complete. Your order is packed."
- **Shiprocket** → Return pickup is requested from the shop for final delivery.

---

### 2.4 Service Management

| Feature | Description |
|---------|-------------|
| Service List | All active services with name, category, base rate, and status indicator. |
| Active/Inactive Toggle | Instantly enable or disable any service. High-contrast colored badges (Green = Active, Red = Inactive). |
| Rate Editor | Inline base rate editing with live **Net Yield calculator** (shows earnings after platform fee deduction). |
| Profit Margin Bar | Visual percentage bar showing margin health for each service. |
| Add New Service | Full form to create a new service offering (name, category, rate, description). |

---

### 2.5 Promotion Manager

A campaign control center for vendor-side discounts.

| Feature | Description |
|---------|-------------|
| Campaign Cards | Each card shows: Campaign name, Discount Code, Status badge (Active/Scheduled/Paused), Expiry date, and Minimum Order Value (MOV) badge. |
| Redemption Gauge | Circular progress indicator showing `used / total limit` with percentage. |
| Usage Progress Bar | Full-width animated bar tracking campaign consumption. |
| Pause/Resume | Instant toggle for any live campaign. |
| Campaign Stats | Summary tiles showing total redemptions and total discount value dispensed. |
| Create/Edit Modal | Full modal form with: Title, Discount Code, Min. Order Value, and Usage Limit fields. Distinctive dark-code-input for the coupon code. |

---

### 2.6 Earnings & Financials

| Screen | Description |
|--------|-------------|
| Earnings | Daily/Weekly/Monthly earnings chart, payout history, pending settlement amounts. |
| Payout Settings | Bank account IFSC/account number form, UPI ID setup for settlement. |

---

### 2.7 Vendor Profile & Settings

| Feature | Description |
|---------|-------------|
| Vendor Profile | Shop name, photo, address, category, operating hours display. |
| Edit Profile | Full edit form for all shop details. |
| Notifications | Vendor-specific notification feed (incoming orders, delivery partner arrivals, settlement confirmations). |
| Support | In-app support/help center for vendor-specific issues. |
| B2B Fulfillment | Dedicated page to manage large-volume B2B laundry contracts (hotel/gym/corporate). |
| Order History | Complete historical order log with status filters and revenue tracking. |
| Terms & Privacy | Legally required pages accessible from vendor profile. |

---

## 3. Logistics & Delivery (Shiprocket)

The platform does not operate its own delivery fleet and has no rider-facing app. All pickup and delivery movement is handled by **Shiprocket**, the third-party logistics provider.

**What this means operationally:**

- Shiprocket assigns a delivery partner to each pickup and each return leg. The platform does not recruit, onboard, schedule, or pay delivery agents.
- The assigned partner's name, phone, and live location are returned by Shiprocket and surfaced to the Customer on the tracking screen and to the Vendor on the order screen.
- The **4-Step Handshake** (see §6.3) is unchanged. OTP verification still gates each handover — the codes are simply exchanged with the Shiprocket partner rather than an in-house rider.
- Delivery costs appear in Admin as **Logistics Disbursements** — a payable to Shiprocket rather than per-rider settlements.

> **Integration status:** `ShiprocketService` is currently a **mock**. It simulates partner assignment and prints pickup OTPs to the server console. Connecting the live Shiprocket account is outstanding work — see §7.

---

## 4. Admin Panel

**Entry Point:** `/admin/login` → Admin Dashboard (with localStorage auth guard)

The Admin Panel is a full enterprise-grade desktop management interface (`slate/white` design language vs. the consumer teal theme) for platform operators to manage all entities.

---

### 4.1 Admin Login

- Secure admin credentials login (localStorage-guarded route).
- All admin routes redirect to `/admin/login` if not authenticated.

---

### 4.2 Dashboard — Mission Control

**Financial Performance Matrix (GMV Strip):**

| Metric | Description |
|--------|-------------|
| Gross Merchandise Volume (GMV) | Total platform order value with growth % indicator. |
| Platform Net Yield | Fee revenue after vendor payouts (15% base take rate). |
| Logistics Disbursements | Total Shiprocket delivery cost with pending count. |
| Vendor Settlements | Total weekly vendor payout amount. |

**System Health Panel:**
- Live API Latency indicator.
- Platform Uptime percentage.
- System Load indicator.
- Real-time sync status.

**Priority Operational Alerts:**
- Dynamic alert cards for: Delayed Pickup (>2h), Unpaid Delivery, and any TAT-overdue orders.
- Each alert has a direct action button ("Intercept" / "Resolve").

**Analytics Charts:**
- Revenue over time (Line Chart).
- Orders vs. Fulfillment Rate (Composed Area + Bar Chart).

**Recent Payouts Table:**
- Vendor name, settlement amount, status badge, and audit timestamp.

---

### 4.3 Vendor Management

| Feature | Description |
|---------|-------------|
| Vendor List | Searchable, sortable table of all registered vendors with status badges. |
| Vendor Detail | Full vendor profile: shop info, documents, performance metrics. |
| Ranking Control | Admin can manually boost or penalize a vendor's visibility score. |
| Blacklist Vendor | Confirmation dialog to blacklist policy violators. Shows "Blacklisted" badge. |

---

### 4.4 Vendor Onboarding Approvals

- Review queue of pending vendor applications.
- View submitted documents (FSSAI, GST, PAN).
- **Approve** → Triggers role-switch success toast + notification to vendor.
- **Reject** → Requires rejection reason; vendor is notified.

---

### 4.5 User Management

| Feature | Description |
|---------|-------------|
| User List | All registered customers with name, phone, tier, and order count. |
| Deactivate Account | Confirmation dialog to deactivate a user for policy violations. Shows "Deactivated" badge. |

---

### 4.6 Order Management

| Feature | Description |
|---------|-------------|
| Orders List | All platform orders with order ID, customer, vendor, status, and value. Filterable. |
| Order Detail | Full order breakdown: item list, logistics chain, payment status, dispute flag. |

---

### 4.7 Financial Operations

| Feature | Description |
|---------|-------------|
| Payouts | Pending and completed vendor settlement list with approval workflow. |
| Pricing Config | Set platform fee percentages, logistics fees, express surcharges, and **Free Delivery Threshold** (orders above ₹X get free delivery). Live preview updates. |

---

### 4.8 Dispute Center

- Queue of active logistics disputes.
- Each dispute shows: Order ID, Type (COD missing, damaged item, missed pickup), involved parties.
- Resolution actions: Assign, Escalate, Close.

---

### 4.9 Help Desk

- Technical support ticket queue from all user personas.
- Ticket assignment, status update, and resolution workflow.

---

### 4.10 Services Management

- Platform-level service catalog management.
- Add, edit, activate, deactivate any service type offered across all vendors.

---

### 4.11 Analytics — 4 Report Types

| Report | Description |
|--------|-------------|
| Revenue Overview | Area chart of platform revenue over time. |
| Orders by Category | Bar chart segmented by service type. |
| Market Segmentation | Donut/Pie chart showing order distribution by category (Laundry / Dry Clean / Ironing / Premium). |
| Operational Global Pulse | Key KPIs: Fulfillment rate, API latency, system faults, avg. order value, active vendors, handshake success rate. |

---

### 4.12 B2B Leads Repository

Dedicated page for enterprise inquiry management.

| Feature | Description |
|---------|-------------|
| Lead Cards | Entity name, contact, primary request quote, lead status, and inbound date. |
| Status Pipeline | New → Contacted → Quoted → Qualified. |
| Pipeline Stats | New inquiries count, active negotiations, estimated ₹ pipeline value, and conversion rate. |
| Export Leads | CSV export action button. |
| Register Manual Lead | Admin can manually log enterprise inquiries. |

---

## 5. Supplier Portal

**Entry Point:** `/supplier` → Supplier Dashboard

The Supplier Portal serves B2B laundry partners — large-volume entities (hotels, hospitals, corporates) who require ongoing laundry contracts through the platform.

---

### 5.1 Authentication

| Screen | Description |
|--------|-------------|
| Supplier Auth | Business email/phone login with OTP. |
| Supplier OTP | Code verification for business accounts. |

---

### 5.2 Supplier Dashboard

- **Active Contract Summary** — Live overview of active supply contracts.
- **Request New Pickup** — Log scheduled bulk pickup requirements.
- **Usage Metrics** — Volume of laundry processed this week/month.
- **Quick Actions** — Navigate to Rate Card, Logistics Tracking, Wallet, and Profile.

---

### 5.3 Supplier Features

| Feature | Route | Description |
|---------|-------|-------------|
| Rate Card | `/supplier/rate-card` | View agreed pricing tiers for bulk laundry (price per kg/item by category). |
| Logistics | `/supplier/logistics` | Track active bulk pickup/delivery jobs. Status and ETA per batch. |
| Fulfillment | `/supplier/fulfillment` | Manage fulfillment schedule: upcoming, in-progress, completed batches. |
| Wallet | `/supplier/wallet` | Prepaid credit balance, invoice history, and top-up options. |
| Profile | `/supplier/profile` | Business profile: company name, GST, contact, contract start date. |

---

## 6. Cross-Platform Features

### 6.1 Notification Engine

A platform-wide Zustand-powered real-time notification system covering **12 BRD-defined event triggers**:

| # | Event | Recipient |
|---|-------|-----------|
| 1 | Order Confirmed | Customer |
| 2 | Delivery Partner Assigned | Customer |
| 3 | Delivery Partner Arrived (OTP-1 Generated) | Customer + Vendor |
| 4 | Pickup Logged / Manifest Locked | Customer + Vendor |
| 5 | Landed at Shop (Handshake 1 Done) | Customer + Vendor |
| 6 | Processing Started | Customer |
| 7 | Cleaning Complete / Order Ready | Customer + Shiprocket |
| 8 | Reverse Pickup OTP | Vendor |
| 9 | Out for Delivery | Customer |
| 10 | At Doorstep | Customer |
| 11 | Final OTP Verified → Payment Triggered | Customer |
| 12 | Payment Success | Vendor |

**GlobalToast Manager** — A hardware-accelerated toast notification renders at the top of the UI across all portal layers, showing immediate feedback for any BRD event.

**Live Unread Badge** — The User Header notification bell shows an animated red badge for unread alerts.

---

### 6.2 Design Language

| Portal | Theme |
|--------|-------|
| Customer (User) | Teal `#89ECDA` background, black typography, premium glassmorphism cards |
| Vendor | White/Black tactical — black gradients, high-contrast typography |
| Admin | Enterprise white — `slate-900` borders, flat minimal typography |
| Supplier | Unified with Vendor design language |

All portals use `Framer Motion` for micro-animations and page transitions.

---

### 6.3 4-Step Logistics Handshake (Universal)

Every persona sees the same progress indicator with the same 4 labels:

```
[● Pickup] ──── [● Intake] ──── [● Processing] ──── [● Handover]
  Step 1           Step 2           Step 3              Step 4
```

- Customer sees it in `OrderTrackingPage`.
- Vendor sees it in `OrderDetails`.

---

## 7. Frontend Completeness Audit

### ✅ Fully Implemented

| Requirement | Status | Notes |
|-------------|--------|-------|
| All 4 persona portals with auth | ✅ Complete | User, Vendor, Admin, Supplier |
| Customer full order journey | ✅ Complete | Splash → Auth → Home → Cart → Confirm → Track → Deliver → Pay |
| 4-Step Handshake Protocol (all personas) | ✅ Complete | Standardized labels and progress bars |
| Vendor Service Management + Toggles | ✅ Complete | Real-time profit margin calculator |
| Vendor Promotion Manager | ✅ Complete | Redemption gauges, MOV, expiry, campaign modal |
| Vendor Dashboard order counters | ✅ Complete | Dynamic badge counts per tab |
| Admin GMV Financial Matrix | ✅ Complete | 4-column dark strip with all financial KPIs |
| Admin System Health Panel | ✅ Complete | Latency, uptime, load indicators |
| Admin B2B Leads Repository | ✅ Complete | Full page + route + pipeline stats |
| Admin Analytics (5 report types) | ✅ Complete | Revenue, Orders, Segmentation, Ops Pulse, Fleet |
| Notification Store (12 events) | ✅ Complete | Zustand-based, persona-filtered |
| GlobalToast Manager | ✅ Complete | Fires on all BRD trigger events |
| Live notification badge in User Header | ✅ Complete | Animated red badge |
| Express Surcharge (1.5×) in Cart | ✅ Complete | Real-time total update |
| Price Breakdown Display | ✅ Complete | 4-line formula transparency |
| Delivery Verification → Auto Pay | ✅ Complete | No manual button after Final OTP |
| Admin Pricing Config | ✅ Complete | Fee percentages + Free Delivery Threshold |
| Admin Vendor Ranking Boost/Penalty | ✅ Complete | Numeric score widget in AdminVendorDetail |
| Admin Deactivate Users/Vendors | ✅ Complete | Confirmation dialog + status badge |
| Admin Onboarding Approval Toast | ✅ Complete | Role-switch success notification |
| Supplier Portal (full) | ✅ Complete | All 5 supplier pages operational |

---

### ⚠️ Known Limitations (Outstanding Work)

| Item | Status | Description |
|------|--------|-------------|
| OTP Delivery | ⚠️ Open | OTP is **hardcoded to `123456`** for every account while development continues. No SMS/WhatsApp gateway is connected — messages are logged to the server console only. **Must be replaced with a real gateway before launch.** |
| Shiprocket Logistics | ⚠️ Open | `ShiprocketService` is a mock. It simulates partner assignment and prints pickup OTPs to the console. The live Shiprocket account is not yet connected. |
| Static Screens | ⚠️ Open | 28 of 155 screens still render demo data rather than live records — notably Admin Pricing Config, Analytics, Reports and B2B Leads, and the Supplier Rate Card, Wallet and Fulfillment pages. |
| Environment Config | ⚠️ Open | No `.env` is committed and no template is documented. Razorpay keys currently fall back to placeholders. |
| Data Persistence | ✅ Done | Backed by MongoDB via Mongoose across ~35 models. |
| Real-time Updates | ✅ Done | Socket.io server and client are live; order status changes push to connected clients. |
| Payment | ✅ Done | Razorpay is integrated for both B2C and B2B. Payments are verified **server-side** by signature and captured amount before an order is marked Paid — the client can no longer declare its own payment status. |
| Photo Uploads | ✅ Done | Cloudinary-backed uploads via Multer. (Some legacy files still sit on local disk — see cleanup notes.) |
| Map/GPS Tracking | ✅ Done | Google Maps SDK loaded via `@react-google-maps/api`, with live partner location on the tracking screen. |
| PDF Invoice | ✅ Done | PDFKit on the backend, jsPDF on the frontend. |
| Push Notifications | ✅ Done | Firebase Cloud Messaging wired through `firebase-admin`. |

---

## 8. Backend Integration Readiness

The frontend is **fully ready for API integration**. Here is the API contract map for each module:

### Auth APIs (All Personas)
- `POST /auth/request-otp` — Send OTP via WhatsApp/SMS
- `POST /auth/verify-otp` — Verify OTP and return JWT
- `POST /auth/register` — Create account (Customer/Vendor)
- `GET /auth/me` — Fetch authenticated user profile

### Customer APIs
- `GET /services` — Fetch service catalog
- `POST /orders` — Place new order
- `GET /orders` — Fetch order history
- `GET /orders/:id` — Fetch order details + live status
- `POST /orders/:id/review` — Submit rating and review

### Vendor APIs
- `GET /vendor/orders` — Fetch incoming/active/done orders
- `PATCH /vendor/orders/:id/ready` — Mark order as ready
- `GET /vendor/services` — Fetch vendor service list
- `PATCH /vendor/services/:id` — Update service rate/status
- `POST /vendor/promotions` — Create promotion/coupon
- `GET /vendor/earnings` — Fetch earnings data

### Logistics APIs (Shiprocket)
- `POST /logistics/request` — Request a handshake (generates the OTP for a handover leg)
- `POST /logistics/verify` — Verify a handshake OTP and advance the order stage

> Pickup and return legs are dispatched through `ShiprocketService` from within the order flow rather than via dedicated routes. Shiprocket status callbacks are not yet wired — see §7.

### Admin APIs
- `GET /admin/dashboard` — Fetch GMV, metrics, alerts
- `GET /admin/vendors` — Fetch all vendors
- `PATCH /admin/vendors/:id/approve` — Approve vendor
- `PATCH /admin/vendors/:id/blacklist` — Blacklist vendor
- `GET /admin/users` — Fetch all users
- `GET /admin/orders` — Fetch all orders
- `GET /admin/analytics` — Fetch analytics data
- `GET /admin/b2b-leads` — Fetch B2B inquiry leads
- `PATCH /admin/pricing` — Update pricing configuration

### Supplier APIs
- `POST /supplier/pickups` — Request bulk pickup
- `GET /supplier/contracts` — Fetch active contracts
- `GET /supplier/wallet` — Fetch credit balance

---

> **Ready for Client Confirmation.** Once you approve the frontend design and all feature screens, backend development can begin against the API contracts listed above.

---

*Document authored by: Loondry Engineering Team*
*Last Updated: April 2026 — Frontend v1.0 Complete*
