// The customer-facing order timeline. Internally the very first status
// is just 'Pending' (see grafiq-api/orders.php), but "Order Placed"
// reads better on the account page — everything else keeps its literal
// status name as the label.
export const ORDER_TIMELINE_STEPS = [
  { status: 'Pending', label: 'Order Placed' },
  { status: 'Confirmed', label: 'Confirmed' },
  { status: 'Processing', label: 'Processing' },
  { status: 'Shipped', label: 'Shipped' },
  { status: 'Out for Delivery', label: 'Out for Delivery' },
  { status: 'Delivered', label: 'Delivered' }
]

export const REPLACEMENT_TIMELINE_STEPS = [
  { status: 'Replacement Requested', label: 'Replacement Requested' },
  { status: 'Under Review', label: 'Under Review' },
  { status: 'Approved', label: 'Approved' },
  { status: 'Replacement Processing', label: 'Replacement Processing' },
  { status: 'Replacement Shipped', label: 'Replacement Shipped' },
  { status: 'Out for Delivery', label: 'Out for Delivery' },
  { status: 'Replacement Delivered', label: 'Replacement Delivered' }
]

// A customer can only cancel while the order is still in one of these
// statuses — kept in sync with CANCELLABLE_STATUSES in
// grafiq-api/order_cancel.php, which is what actually enforces this.
// This copy is only used to decide whether to *show* the button; the
// backend is the real gate.
export const CANCELLABLE_STATUSES = ['Pending', 'Confirmed', 'Processing']

export const REPLACEMENT_ELIGIBLE_STATUS = 'Delivered'

/**
 * Given an order/replacement's statusHistory (array of {status, at}) and
 * the timeline step list, returns { steps: [{...step, done, at}], isTerminalOther }
 * where isTerminalOther flags a status outside the normal happy path
 * (Cancelled / Rejected) that should be shown as its own badge instead
 * of a timeline position.
 */
export function buildTimeline(statusHistory, steps, terminalOtherStatuses = []) {
  const history = Array.isArray(statusHistory) ? statusHistory : []
  const historyMap = new Map(history.map((h) => [h.status, h.at]))

  const currentStatus = history.length ? history[history.length - 1].status : steps[0]?.status
  const isTerminalOther = terminalOtherStatuses.includes(currentStatus)

  // Highest step index actually reached, ignoring the terminal-other
  // status itself (e.g. a Cancelled order still shows Pending/Confirmed
  // as done up to the point it was cancelled).
  let reachedIndex = -1
  steps.forEach((step, i) => {
    if (historyMap.has(step.status)) reachedIndex = Math.max(reachedIndex, i)
  })

  const builtSteps = steps.map((step, i) => ({
    ...step,
    done: i <= reachedIndex,
    at: historyMap.get(step.status) || null
  }))

  return {
    steps: builtSteps,
    currentStatus,
    isTerminalOther,
    terminalAt: isTerminalOther ? historyMap.get(currentStatus) : null
  }
}

export function formatTimelineDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  })
}

// Admin-facing "Order Activity" timeline — shorter and ops-focused
// compared to ORDER_TIMELINE_STEPS above. "Payment Confirmed" isn't an
// order `status` at all (status_history only tracks order.status
// transitions), so this is built from a mix of status_history entries,
// the order's linked Razorpay payment record, and — for a plain COD
// order that was never prepaid online — the Delivered timestamp as a
// stand-in for "cash collected".
export function buildAdminActivity(order) {
  const history = Array.isArray(order?.statusHistory) ? order.statusHistory : []
  const historyMap = new Map(history.map((h) => [h.status, h.at]))

  const placedAt = order?.createdAt || null

  let paymentConfirmedAt = null
  if (order?.paymentStatus === 'paid' || order?.paymentStatus === 'partial') {
    paymentConfirmedAt = order?.payment?.verifiedAt || order?.payment?.createdAt || placedAt
  } else if (order?.paymentMethod === 'COD' && historyMap.has('Delivered')) {
    paymentConfirmedAt = historyMap.get('Delivered')
  }

  const steps = [
    { key: 'placed', label: 'Order Placed', at: placedAt, done: !!placedAt },
    {
      key: 'payment',
      label: order?.paymentStatus === 'partial' ? 'Advance Paid' : 'Payment Confirmed',
      at: paymentConfirmedAt,
      done: !!paymentConfirmedAt
    },
    {
      key: 'processing',
      label: 'Processing',
      at: historyMap.get('Processing') || null,
      done: historyMap.has('Processing')
    },
    {
      key: 'shipped',
      label: 'Shipped',
      at: historyMap.get('Shipped') || order?.shipping?.bookedAt || null,
      done: historyMap.has('Shipped') || !!order?.shipping?.bookedAt
    },
    {
      key: 'delivered',
      label: 'Delivered',
      at: historyMap.get('Delivered') || null,
      done: historyMap.has('Delivered')
    }
  ]

  // Once a later step is done, treat every earlier one as done too (an
  // order that's Shipped was necessarily Processing at some point, even
  // if that exact status transition was skipped/not recorded) — this
  // only fills gaps forward, it never invents a timestamp for a step.
  let sawDone = false
  for (let i = steps.length - 1; i >= 0; i--) {
    if (steps[i].done) sawDone = true
    else if (sawDone) steps[i].done = true
  }

  return steps
}
