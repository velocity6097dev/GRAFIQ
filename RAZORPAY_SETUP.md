# GRAFIQ — Razorpay Setup

Checkout now has a real "Pay Online" option powered by Razorpay (UPI,
cards, netbanking, wallets — all inside Razorpay's own hosted checkout),
alongside Cash on Delivery. Here's how the payment confirmation actually
works, and what you need to do to turn it on.

## How it works (the "queue" part)

A payment goes through two checks, not one:

1. **Instant check (in the browser's request):** the moment Razorpay's
   popup reports success, our backend verifies the cryptographic
   signature Razorpay sent back, and cross-checks the amount against
   Razorpay's own order record — this happens in
   `grafiq-api/razorpay_verify.php`. If it passes, the order is created
   immediately and marked `paid`, so the customer isn't kept waiting.
2. **Background re-check (the queue):** that same request also drops a
   row into the `payments` table with `status = 'pending_verification'`.
   That's the queue. `grafiq-api/razorpay_queue_worker.php` works
   through every row in that state and independently asks Razorpay's
   API "did this payment actually clear?" — catching anything the fast
   check might miss (e.g. a payment that gets disputed/reversed right
   after capture). If it doesn't check out, the order's payment status
   flips from `paid` to `failed` so you can see it needs a look.

You can trigger that second check two ways:
- **On demand:** the admin Orders page has a "Verify Pending Payments"
  button that runs it right now.
- **On a schedule (recommended once you're live):** run
  `php grafiq-api/razorpay_queue_worker.php` from a real cron job
  (Linux/Mac) or Windows Task Scheduler, every minute or two.

There's also `grafiq-api/razorpay_webhook.php` for later — an
event-driven alternative to polling, but it needs a public HTTPS URL
Razorpay can reach, so it won't do anything on local XAMPP. Ignore it
until you deploy somewhere public.

## Admin: Verify Payment / Refund on an order

Every order's page in the admin panel (Orders → an order) has a
**Payment** section. If that order has a Razorpay payment linked to it,
you'll see:
- **Verify Payment** — re-checks that specific payment against
  Razorpay's API right now, independent of the background queue worker
  above. Useful if you don't want to wait for the next queue run.
- **Refund** — issues a refund via Razorpay. It defaults to the full
  amount that was actually paid, but you can lower it (e.g. to deduct
  shipping charges before refunding the rest, per your terms).

Both are backed by `grafiq-api/payment_action.php`, and both need your
real Razorpay keys configured (step 2 above) to do anything.

## Partial COD (non-refundable advance on Cash on Delivery)

Under **Admin → Settings → Cash on Delivery**, you can set a **COD
Advance %**. When it's above 0:
- A customer choosing Cash on Delivery at checkout is charged that % of
  the order total right now, through Razorpay (same hosted checkout as
  a normal online payment) — the rest stays payable in cash when the
  order arrives.
- That advance is **non-refundable** by design, so cancelling the order
  does **not** auto-refund it (unlike a fully-paid Razorpay order, which
  does auto-refund on cancellation). If you want to refund some or all
  of it anyway — say, minus shipping charges you already spent — do
  that manually from the order's Payment section (**Refund**, above),
  where you can enter any amount up to what was paid.
- The order's Payment Status shows as `partial` (not `paid`) the whole
  way through, since only the advance went through Razorpay — the
  balance is still cash-on-delivery.

Leave it at **0** (the default) and COD works exactly as it always has:
no upfront charge, the full amount collected in cash on delivery.

If you're formalizing this in your Terms & Conditions, the two things
worth stating explicitly are: (1) the advance is non-refundable, and
(2) any refund of it (e.g. after deducting shipping) is handled
case-by-case, not automatically.

## Setup

### 1. Get test-mode API keys (free, no verification needed)

1. Sign up at https://dashboard.razorpay.com/signup
2. Go to **Settings → API Keys** (or https://dashboard.razorpay.com/app/keys)
3. Generate a **test mode** key pair. You'll get a **Key ID**
   (`rzp_test_...`) and a **Key Secret** — copy both, the secret is only
   shown once.

### 2. Add them to the backend

Open `grafiq-api/config.php` and replace:

```php
const RAZORPAY_KEY_ID = 'rzp_test_XXXXXXXXXXXXXX';
const RAZORPAY_KEY_SECRET = 'YOUR_TEST_KEY_SECRET_HERE';
```

with your real test values. **Never** put the Key Secret in any
frontend file — it only belongs here, server-side. The Key ID is fine
to expose (the frontend gets it automatically from
`razorpay_create_order.php`'s response — you don't need to add it
anywhere else).

### 3. If you already imported the old schema

Run `grafiq-api/schema/migration/migration_razorpay.sql` in phpMyAdmin
(Import tab) — it adds the `payments` table and `orders.payment_status`
column without touching your existing products/orders/etc. Setting up
fresh? Just import `schema.sql`, it already includes this.

Want the partial-COD feature and the expanded admin order page too? Also
run `grafiq-api/schema/migration/migration_admin_order_page.sql` — see
[`DATABASE_SETUP.md`](./DATABASE_SETUP.md#already-have-a-database-from-before)
for the full migration order.

### 4. Test it

Add something to your cart, go to checkout, choose **Pay Online**, and
use one of Razorpay's official test cards/UPI IDs (test mode never
charges real money):

- **Card:** `4111 1111 1111 1111`, any future expiry, any CVV
- **UPI:** `success@razorpay` (always succeeds) or `failure@razorpay`
  (always fails, useful for testing the failure path)

Full list of test credentials: https://razorpay.com/docs/payments/payments/test-card-upi-details/

After a successful test payment, check:
- The order shows up on `/order-success/...` with **Payment Status: Paid**.
- In the admin Orders page, the same order shows **Paid**, and clicking
  **Verify Pending Payments** should report it as verified (or it may
  already show verified if the automatic nudge on the success page beat
  you to it).

## Troubleshooting

**"Razorpay keys are not set up yet"**
You haven't replaced the placeholder values in `config.php` yet — see
step 2.

**Checkout modal doesn't open**
Open the browser console — usually either the script failed to load
(check your internet connection) or `razorpay_create_order.php` returned
an error (check the Network tab for the response body, it'll say why).

**Payment succeeds in the Razorpay popup but the order never appears**
Check `razorpay_verify.php`'s response in the Network tab. The two most
likely causes: the signature check failed (shouldn't happen with real
Razorpay-issued keys — only if the key secret in `config.php` doesn't
match what you generated the order with), or the amount cross-check
failed (shouldn't happen in normal use — it's specifically there to
catch tampering).

**Order shows "Paid" but "Verify Pending Payments" flips it to "Failed"**
This means the fast check passed but Razorpay's own records disagree —
worth checking that specific payment in the Razorpay dashboard directly.
This is the queue doing its job.
