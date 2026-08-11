# GRAFIQ — Shiprocket Setup

The admin order page's **Shipping Partner** card now talks to the real
Shiprocket API instead of the old mock quotes: **Compare Couriers** pulls
live rates for that order's actual delivery pincode, **Book** creates a
real Shiprocket shipment and assigns an AWB, **Track Shipment** opens
Shiprocket's own live tracking page, and **Cancel Shipment** cancels it
on their side too. Here's how it works and what you need to do to turn
it on.

## How it works

1. **Compare Couriers** calls `grafiq-api/shiprocket_action.php` with
   `action: 'rates'`, which hits Shiprocket's
   `GET /courier/serviceability/` for that order's delivery pincode,
   estimated parcel weight (item count × 0.3kg, same estimate the old
   mock used), and COD/Prepaid flag — then returns the live list of
   serviceable couriers, sorted cheapest first.
2. **Book** (`action: 'book'`) creates the Shiprocket order
   (`POST /orders/create/adhoc`) the first time you book any courier for
   that order, then assigns an AWB to the courier you picked
   (`POST /courier/assign/awb`) and tries to schedule a pickup
   (`POST /courier/generate/pickup` — best-effort; a handful of reasons
   this can fail have nothing to do with the booking itself, like being
   past a courier's daily cutoff time, so it won't block the booking from
   being recorded either way). Picking a **different** courier for the
   same order afterwards (shown as **Change Courier**) reassigns the AWB
   on that *same* Shiprocket shipment rather than creating a second one —
   Shiprocket's `order_id` has to stay unique per account, and this app
   uses your own order ID (e.g. `GRQ482913`) for it.
3. **Track Shipment** (`action: 'track'`) calls Shiprocket's live
   tracking endpoint and opens the `track_url` it returns — this is
   Shiprocket's own public tracking page for that shipment, not a generic
   Google search like before.
4. **Cancel Shipment** (`action: 'cancel'`) cancels the linked Shiprocket
   order via `POST /orders/cancel`. This is separate from changing the
   order's own status dropdown — cancelling here only tells Shiprocket to
   stop the shipment, it doesn't touch this order's status in GRAFIQ.

Nothing above needed a new column on `orders` — the booked courier name,
AWB/tracking number, and Shiprocket's own order/shipment IDs all live
inside the existing `orders.shipping` JSON column, the same one the old
mock flow already wrote to. The only new table is a tiny one-row
`shiprocket_auth` cache for the API's bearer token (valid 240 hours —
see below), so it doesn't have to log in on every single request.

## Setup

### 1. Create a Shiprocket account + a dedicated API user

1. Sign up (or log in) at https://app.shiprocket.in
2. Add at least one **pickup address** under **Settings → Pickup
   Addresses** — this is where couriers collect your parcels from, and
   Shiprocket won't quote rates without one. Note its **Nickname** (you
   pick this when adding it) and its **pincode** — you'll need both
   below.
3. Go to **Settings → API → Configure** and click **Add New API User**.
   Use a dedicated email/password here, **not** your normal Shiprocket
   login — this is what the backend authenticates with.

### 2. Add your credentials to the backend

Open `grafiq-api/config.php` and replace:

```php
const SHIPROCKET_EMAIL = 'YOUR_SHIPROCKET_API_USER_EMAIL';
const SHIPROCKET_PASSWORD = 'YOUR_SHIPROCKET_API_USER_PASSWORD';
const SHIPROCKET_PICKUP_LOCATION = 'Primary';
const SHIPROCKET_PICKUP_PINCODE = '000000';
```

with your real API user email/password, your pickup address's exact
**Nickname** (case-sensitive — must match Shiprocket's dashboard exactly,
this is what `pickup_location` gets sent as when creating an order), and
that same address's 6-digit pincode.

The three default box dimensions right below those (`LENGTH`, `BREADTH`,
`HEIGHT`, all in cm) are a placeholder — there's no per-product
dimension data in this store yet, so every order books with the same box
size. Adjust them to whatever a typical GRAFIQ order actually looks like
once packed; it only affects the rate quotes, not whether booking works.

### 3. If you already imported the old schema

Run `grafiq-api/schema/migration/migration_shiprocket.sql` in phpMyAdmin
(Import tab) — it adds the `shiprocket_auth` token-cache table without
touching anything else. Setting up fresh? Just import `schema.sql`, it
already includes this table.

### 4. Test it

Open any order in the admin panel that has a real, deliverable Indian
address on it, and click **Compare Couriers**. If your pickup pincode and
API user are both correct, you should see a live list of couriers with
real rates within a couple seconds. Book one, then **Track Shipment**
should open a real Shiprocket tracking page for it (it may show "no
scans yet" for the first hour or two — that's normal, it just means the
courier hasn't picked it up yet).

Shiprocket doesn't have a sandbox/test mode the way Razorpay does — every
booking here is a real shipment on your real account. If you're just
testing the integration itself rather than actually planning to ship
something, cancel the shipment afterwards from the Shiprocket dashboard
(or the **Cancel Shipment** button here) so it doesn't sit in your
pickup queue.

## Troubleshooting

**"Shiprocket is not set up yet"**
You haven't replaced the placeholder values in `config.php` yet — see
step 2.

**"Shiprocket rejected the login"**
Double-check the API user email/password in `config.php` — this has to
be the dedicated API user from step 1, not your normal Shiprocket
account login. You can also test it directly by logging in with the same
email/password at https://app.shiprocket.in.

**"Shiprocket has no serviceable courier for this pincode/weight right
now"**
Either genuinely no courier services that delivery pincode at that
weight (rare, but happens for very remote pincodes), or
`SHIPROCKET_PICKUP_PINCODE` in `config.php` isn't a real, registered
pickup address pincode on your account — double check it matches exactly
what's under Settings → Pickup Addresses.

**Booking fails with an error mentioning "pickup_location"**
`SHIPROCKET_PICKUP_LOCATION` in `config.php` has to match your pickup
address's Nickname *exactly*, including capitalization — copy it
straight from Settings → Pickup Addresses rather than retyping it.

**Partial-COD orders (see `RAZORPAY_SETUP.md`'s "Partial COD" section)**
Shiprocket's order-creation API doesn't have a separate "amount to
collect on delivery" field distinct from the order's sub-total, so a
partial-COD order (where some was already paid online) will show its
*full* total as the COD-collectable amount on Shiprocket's side — the
advance already collected isn't deducted there automatically. If that
matters for your reconciliation, adjust it manually in the Shiprocket
dashboard after booking.

**Tracking shows nothing / "no tracking data yet"**
Normal for the first hour or two after booking, before the courier has
scanned the parcel for pickup. If it persists for more than a day, check
the shipment directly in the Shiprocket dashboard.
