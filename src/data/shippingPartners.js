// A small mock roster of Indian courier partners with a rough per-shipment
// pricing model. This is deliberately simple (no real API) so the admin
// panel's "compare & book" flow works out of the box — swap `getShippingQuotes`
// in utils/shipping.js for a real aggregator's rate-check endpoint
// (Shiprocket, Shipway, Delhivery One, Pickrr, etc.) when you're ready to
// book actual shipments.
const shippingPartners = [
  { id: 'delhivery', name: 'Delhivery', etaDays: '2–4 days', baseRate: 40, perKgRate: 25, rating: 4.3 },
  { id: 'bluedart', name: 'Blue Dart', etaDays: '1–3 days', baseRate: 60, perKgRate: 35, rating: 4.6 },
  { id: 'dtdc', name: 'DTDC', etaDays: '3–5 days', baseRate: 35, perKgRate: 20, rating: 4.0 },
  { id: 'xpressbees', name: 'Xpressbees', etaDays: '2–5 days', baseRate: 38, perKgRate: 22, rating: 4.1 },
  { id: 'ecomexpress', name: 'Ecom Express', etaDays: '3–6 days', baseRate: 32, perKgRate: 18, rating: 3.9 },
  { id: 'shadowfax', name: 'Shadowfax', etaDays: '1–2 days', baseRate: 55, perKgRate: 30, rating: 4.4 }
]

export default shippingPartners
