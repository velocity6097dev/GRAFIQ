# GRAFIQ — Custom Print Streetwear Store

A full React storefront for custom-printed clothing, built to match the GRAFIQ
brand sheet (black/acid-lime, Anton/Bebas Neue/Barlow, grunge-tape aesthetic).
Built with **React + React Router + Tailwind CSS + Framer Motion**, backed by
**MySQL via a small PHP API** (see `grafiq-api/`).

> **Setting this up for the first time?** See
> [`DATABASE_SETUP.md`](./DATABASE_SETUP.md) for the XAMPP/MySQL steps —
> do that first, then come back here. Want online payments working too?
> See [`RAZORPAY_SETUP.md`](./RAZORPAY_SETUP.md) after that.

## Quick start

```bash
npm install
npm run dev       # http://localhost:5173
```

This assumes the PHP API is already running via XAMPP at
`http://localhost/grafiq-api` (see `DATABASE_SETUP.md`). Without it, the
site still loads using bundled demo data, but nothing will save.

Build for production:

```bash
npm run build      # outputs to /dist
npm run preview    # preview the production build locally
```

## What's inside

- **Fully responsive** storefront (mobile menu, cart drawer, off-canvas
  filters) — the same components adapt from phone to desktop.
- **Hero banner carousel** for launches/offers, 100% controlled from the
  admin panel (`/admin/banners`) — no code changes needed to swap a promo.
- **Categories** manageable from the admin panel (`/admin/categories`) —
  add/edit/delete, and the homepage category grid + shop filters update
  automatically.
- **Discount pricing**: any product with a `discount` % set shows the
  struck-through original price, the new price, and a "X% OFF" badge
  everywhere it appears (`components/product/PriceTag.jsx`).
- **Recommendations**: a horizontally-scrollable "Recommended for you" row
  on the homepage and a "You may also like" row on every product page.
- **Design Your Own**: a custom-order builder — upload artwork, pick base
  garment / colour / size / print placement, live price calculation, adds
  a custom line item to the cart.
- **Phone + OTP login** for customers, gating checkout (`components/auth`).
- **Branded logo** everywhere the old "GRAFIQ" text used to be — navbar,
  mobile menu, footer, admin sidebar, admin login, and the browser
  favicon/tab icon (`src/assets/logo.png` for the wide wordmark,
  `src/assets/logo-square.png` for square/icon spots). Swap those two
  files to rebrand.
- **Order tracking & shipping**: the admin Orders page now has a search
  box (order ID, customer name/phone, or tracking ID) plus a dedicated
  order detail page (`/admin/orders/:id`) where you can type in a
  tracking ID manually, or compare live-computed quotes from six mock
  courier partners and book one with a click — booking auto-fills the
  tracking ID and bumps the order to "Shipped". Customers see the
  tracking ID and courier name on their own order history once booked.

All store data (products, categories, banners, settings, orders, cart,
wishlist, login session) persists to the browser's `localStorage`, so the
whole thing works immediately with **no backend** — perfect for demos,
client review, or as a starting point before you wire up a real database.

## Project structure

```
src/
├── main.jsx                 # app entry, wraps <App/> in all providers
├── App.jsx                  # route table (public storefront + /admin)
├── StoreLayout.jsx           # navbar + footer shell for public pages
├── index.css                 # Tailwind + brand utility classes
│
├── data/                     # seed data (first-run defaults only)
│   ├── products.js
│   ├── categories.js
│   ├── banners.js
│   └── settings.js
│
├── context/                  # global state, all persisted to localStorage
│   ├── StoreContext.jsx      # products/categories/banners/settings/orders CRUD
│   ├── CartContext.jsx
│   ├── AuthContext.jsx       # customer OTP login + admin login
│   └── WishlistContext.jsx
│
├── hooks/
│   └── useLocalStorage.js
│
├── utils/
│   └── format.js             # currency formatting, discount math, id/slug helpers
│
├── components/
│   ├── ui/                   # Button, Badge, SectionHeading, Modal
│   ├── layout/                # Navbar, MobileMenu, CartDrawer, Footer
│   ├── home/                  # HeroBanner, FeatureStrip, CategoryGrid,
│   │                          #   ProductGrid, RecommendedSlider, DesignYourOwnCTA
│   ├── product/                # ProductCard, PriceTag
│   ├── auth/                   # PhoneOtpFlow, OTPModal
│   └── checkout/                # AddressForm, PaymentOptions
│
└── pages/
    ├── Home.jsx, Shop.jsx, ProductDetail.jsx, DesignYourOwn.jsx
    ├── Cart.jsx, Checkout.jsx, OrderSuccess.jsx
    ├── Login.jsx, Account.jsx, About.jsx, Contact.jsx
    └── admin/
        ├── AdminLogin.jsx, AdminLayout.jsx, Dashboard.jsx
        ├── ManageProducts.jsx, ManageCategories.jsx, ManageBanners.jsx
        ├── ManageOrders.jsx, Settings.jsx
```

## Before you go live — things that are mocked on purpose

This is a front-end-first build. Two things are intentionally simulated so
you can test the full user flow without any backend, and are clearly
marked with `TODO(production)` comments in the code:

1. **OTP verification** (`src/context/AuthContext.jsx`) — every phone
   number currently receives the same demo code (shown on-screen in dev
   mode). Swap `sendOtp`/`verifyOtp` for calls to a real SMS/OTP provider
   (Firebase Phone Auth, MSG91, Twilio Verify, etc.) on your backend.

2. **Payment** (`src/pages/Checkout.jsx`, `components/checkout/PaymentOptions.jsx`) —
   "Pay Now" currently simulates a successful payment after a short delay
   and creates the order immediately. Replace this with a real gateway
   (Razorpay, Stripe, Cashfree) and only create the order after the
   gateway confirms payment via a server-side webhook.

3. ~~**Shipping partner rates**~~ — **no longer mocked.** The admin order
   page's Shipping Partner card (`src/pages/admin/OrderDetail.jsx`) now
   calls the real Shiprocket API (`grafiq-api/shiprocket_action.php`) for
   live rate comparison, booking, tracking, and cancellation. See
   [`SHIPROCKET_SETUP.md`](./SHIPROCKET_SETUP.md) to configure your
   Shiprocket credentials.

You'll also want a real backend/database once you're ready to go beyond a
single browser's localStorage — at that point, `StoreContext.jsx` is the
one file to swap from localStorage reads/writes to API calls; every
component already consumes it through the `useStore()` hook, so the rest
of the app won't need to change.

## Brand tokens (from the reference sheet)

| Token | Value |
|---|---|
| Ink (background) | `#0D0D0D` |
| Panel | `#1A1A1A` |
| Paper (text) | `#FFFFFF` |
| Volt (accent) | `#CAD600` |
| Slate (muted) | `#808080` |
| Display font | Anton |
| Accent font | Bebas Neue |
| Body font | Barlow |

## Admin access

Visit `/admin/login` — demo credentials: `admin` / `admin123`. Change these
in `src/context/AuthContext.jsx` before deploying.
