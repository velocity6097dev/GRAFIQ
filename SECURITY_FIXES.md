# GRAFIQ — Security Fixes (Auth & Order Pricing)

This documents the fix for a batch of P0 findings: every admin/data-mutation
endpoint was reachable with no authentication at all, "logged in" was just a
localStorage flag with nothing behind it, and order pricing was trusted
directly from the client. Read this once to understand what changed and how
to verify it; it's not something you need to touch day-to-day.

## What was actually wrong

Before this fix:
- `admin_auth.php` and `customer_auth.php`'s OTP-verify only ever returned
  `{success: true}` on a correct login. Nothing was issued back — the
  frontend's "am I logged in" state was a plain `localStorage` flag
  (`grafiq_is_admin: true`, or a `user` object) that anyone could set in
  devtools console with zero credentials. Every other endpoint just trusted
  whatever the client claimed about itself.
- `orders.php`'s GET returned **every order in the database**, to anyone,
  with no auth check — and the frontend called it unconditionally on every
  single page load, for every visitor, not just in the admin panel. The
  "My Orders" page worked by filtering that full dump down to the signed-in
  phone number *in the browser*. Same problem for `replacements.php`.
- Every write endpoint — products, categories, banners, settings, orders,
  payments, replacements, Shiprocket, the customer-trust lookup — had no
  authorization check of any kind. Anyone with the API's base URL could
  edit the catalog, change any order's status, issue refunds, or read any
  customer's order history and trust score by phone number.
- `razorpay_create_order.php` charged whatever `amount` the client sent —
  nothing tied that number to the actual cart contents or real product
  prices. The same gap existed in the plain Cash-on-Delivery path
  (`orders.php`'s POST), which stored whatever `total`/item prices the
  client sent with no check against the catalog at all.

## What changed

### Real sessions, not a localStorage flag

`admin_auth.php` (login) and `customer_auth.php` (`verify_otp`) now issue a
64-character random token, stored server-side in two new tables —
`admin_sessions` / `customer_sessions` — with an expiry (7 days for admin,
30 for customers). The frontend sends it back on every request as a header:
`X-Admin-Token` for admin actions, `X-Customer-Token` for anything scoped to
a signed-in customer (`src/api/client.js` attaches these automatically from
`localStorage` — you don't need to pass them by hand anywhere).

Every endpoint that needs to know who's asking calls one of two helpers in
`config.php`:
- `require_admin($pdo)` — exits with 401 if there's no valid, unexpired
  admin session. Used by every admin-only write and by admin-only read
  endpoints (customer trust, the full order list, etc).
- `require_customer($pdo)` — returns the verified phone number from the
  session, and is what every endpoint now uses instead of trusting a
  `phone`/`customerPhone` field in the request body. This is the actual
  fix for "customer profile update trusts phone number from request" and
  the order/replacement ownership checks — the phone comes from something
  the client can't just type in.

A stored token is also checked once on app load (`admin_auth.php`'s
`verify` action / `customer_auth.php`'s `whoami` action) so a stale or
expired token gets cleared immediately instead of failing confusingly on
the first real action.

### Order data is scoped, not global

`orders.php`'s GET now has three modes:
- No params → admin-only (`require_admin`), returns everything. This is
  what the admin Dashboard/Orders pages use.
- `?mine=1` → requires a customer session, returns only that phone's
  orders. This is what the Account page uses now.
- `?id=X` → allowed for an admin, or for the customer session that
  actually owns that order — 403 otherwise.

`replacements.php` follows the same shape. Critically, **the frontend no
longer fetches orders/replacements unconditionally on page load** —
`StoreContext.jsx` only fetches the admin-scoped set once there's a signed-in
admin session, and the customer-scoped set once there's a signed-in
customer, each in its own effect. Previously every visitor's browser
downloaded the entire orders table just so the admin panel and Account page
had data ready if needed.

### Order pricing is computed server-side, not trusted from the client

`compute_order_totals()` in `config.php` is now the one place that decides
what an order costs. It looks up every catalog item's real price/discount
fresh from `products` (ignoring whatever the client sent), prices "Design
Your Own" custom items from a small mirrored table (`CUSTOM_GARMENT_PRICES`
/ `CUSTOM_PLACEMENT_FEES` — keep these in sync with
`src/pages/DesignYourOwn.jsx` if you ever change those prices), checks
stock, and computes subtotal/discount/delivery-fee/total from scratch. It's
wired into **both** order-creation paths:
- `orders.php`'s POST (plain COD)
- `razorpay_verify.php` (online payment / COD advance) — which now also
  cross-checks the *recomputed* total against what Razorpay actually
  charged, not a client-claimed `paidAmount`
- `razorpay_create_order.php` now takes cart `items` instead of a raw
  `amount`, and computes the charge amount itself the same way

A client can still send whatever it wants in `price`, `subtotal`, `total`,
etc. — none of it is used for anything that touches money anymore.

### Everything else

- `products.php`, `categories.php`, `banners.php` — GET stays public
  (the storefront needs it), POST/PUT/DELETE now require admin.
- `settings.php` — GET public, PUT admin-only.
- `payment_action.php`, `shiprocket_action.php`, `customer_trust.php` —
  fully admin-gated (they always were admin-only *in intent*, just never
  enforced).
- `order_cancel.php` — ownership now checked against the session, not a
  `customerPhone` field in the body.
- `replacements.php`'s POST — same fix, phone comes from the session.

## What this deliberately does NOT change

- **`razorpay_queue_worker.php`** is still callable without auth. It's
  designed to be triggered by any visitor landing on the order-success
  page (a "nudge the verification queue" convenience for local dev without
  cron running) — it doesn't accept any client input that could be used to
  target or manipulate anything, it only re-verifies already-pending
  payments against Razorpay's own API. If you'd rather lock this down too,
  it's a one-line `require_admin($pdo)` add, but doing so would also mean
  wiring a proper cron job before deploying, since the "on-demand" trigger
  is currently doing double duty as your only automatic verification path
  locally.
- **The OTP is still a hardcoded demo code (`1234`)** — that was already
  called out as a "swap this before going live" item, not part of this
  fix. See the comment at the top of `customer_auth.php`.

## How to verify

1. **Admin auth**: log into `/admin/login`, confirm the dashboard loads.
   Open devtools → Application → Local Storage → delete
   `grafiq_admin_token` (leave `grafiq_is_admin` as `true`) → reload. You
   should briefly see a loading spinner, then land back on the login page
   — not a flash of the dashboard with broken/empty data.
2. **Endpoint lockdown**: with no admin token, try
   `curl -X PUT http://localhost/grafiq-api/settings.php -d '{"storeName":"pwned"}'`
   — should get a 401 with `{"error":"Admin sign-in required."}`.
3. **Order scoping**: verify an OTP for one phone number, place an order,
   then check `/orders.php?mine=1` with that session only returns that
   phone's orders — and that a second phone number's session can't fetch
   the first order by id (`/orders.php?id=<first order's id>` → 403).
4. **Pricing**: place a real order end-to-end, confirm the total shown in
   the admin panel matches the actual catalog prices at the time — then
   try (via a raw API call, not the UI) sending a tampered `total`/item
   `price` and confirm it's ignored.
