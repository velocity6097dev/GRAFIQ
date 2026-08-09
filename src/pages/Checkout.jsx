import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useCart } from '../context/CartContext'
import { useAuth } from '../context/AuthContext'
import { useStore } from '../context/StoreContext'
import { formatPrice } from '../utils/format'
import { loadRazorpayScript } from '../utils/razorpay'
import { api } from '../api/client'
import AddressForm from '../components/checkout/AddressForm'
import PaymentOptions from '../components/checkout/PaymentOptions'
import OTPModal from '../components/auth/OTPModal'
import Button from '../components/ui/Button'

const emptyAddress = { name: '', phone: '', pincode: '', line1: '', city: '', state: '' }

// The address fields live in a page layout, not a submittable <form>, so
// HTML's `required` attribute never actually fires (that only triggers on
// a real form-submit event). This runs the same checks by hand so a click
// on "Pay Now" with missing fields turns them red with a message instead
// of doing nothing.
function validateAddress(address) {
  const errors = {}
  if (!address.name.trim()) errors.name = 'Name is required.'
  if (!/^\d{10}$/.test(address.phone)) errors.phone = 'Enter a valid 10-digit mobile number.'
  if (!/^\d{6}$/.test(address.pincode)) errors.pincode = 'Enter a valid 6-digit pincode.'
  if (!address.line1.trim()) errors.line1 = 'Address is required.'
  if (!address.city.trim()) errors.city = 'City is required.'
  if (!address.state.trim()) errors.state = 'State is required.'
  return errors
}

export default function Checkout() {
  const navigate = useNavigate()
  const { items, payable, subtotal, discountTotal, clearCart } = useCart()
  const { user } = useAuth()
  const { settings, addOrder, verifyRazorpayPayment } = useStore()

  const [otpOpen, setOtpOpen] = useState(!user)
  const [address, setAddress] = useState(emptyAddress)
  const [errors, setErrors] = useState({})
  const [payment, setPayment] = useState('razorpay')
  const [placing, setPlacing] = useState(false)
  const [orderError, setOrderError] = useState('')

  const deliveryFee = payable >= settings.freeDeliveryAbove || payable === 0 ? 0 : settings.deliveryFee
  const total = payable + deliveryFee

  if (items.length === 0) {
    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center">
        <p className="font-display text-3xl uppercase mb-3">Nothing to check out</p>
        <Button as={Link} to="/shop" variant="primary">Browse the Shop</Button>
      </div>
    )
  }

  const buildOrderData = () => ({
    items,
    address,
    subtotal,
    discountTotal,
    deliveryFee,
    total,
    customerPhone: user?.phone
  })

  const finishOrder = async (order) => {
    clearCart()
    navigate(`/order-success/${order.id}`)
  }

  // Cash on Delivery — no gateway involved, order is created straight away.
  const handleCodOrder = async () => {
    const order = await addOrder({ ...buildOrderData(), paymentMethod: 'COD' })
    await finishOrder(order)
  }

  // Razorpay — the real three-step flow:
  //   1. Ask our backend to create a Razorpay order (server-side, needs
  //      the secret key — never do this from the browser).
  //   2. Open Razorpay's hosted checkout with that order id.
  //   3. On success, send the payment_id/order_id/signature to our
  //      backend, which verifies the signature, cross-checks the amount
  //      against Razorpay's own record, creates our order, and queues it
  //      for a second independent verification pass in the background.
  const handleRazorpayOrder = async () => {
    const { razorpayOrderId, amount, currency, keyId } = await api.post('/razorpay_create_order.php', {
      amount: total
    })

    await loadRazorpayScript()

    return new Promise((resolve, reject) => {
      const rzp = new window.Razorpay({
        key: keyId,
        amount,
        currency,
        order_id: razorpayOrderId,
        name: 'GRAFIQ',
        description: `Order payment — ${items.length} item${items.length > 1 ? 's' : ''}`,
        prefill: { contact: user?.phone, name: address.name },
        theme: { color: '#CAD600' },
        handler: async (response) => {
          try {
            const order = await verifyRazorpayPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
              orderData: { ...buildOrderData(), paymentMethod: 'Razorpay' }
            })
            await finishOrder(order)
            resolve()
          } catch (err) {
            reject(err)
          }
        },
        modal: {
          // User closed the Razorpay popup without paying — not an error,
          // just stop the "Placing Order…" spinner.
          ondismiss: () => resolve('dismissed')
        }
      })
      rzp.on('payment.failed', (response) => {
        reject(new Error(response.error?.description || 'The payment failed. Please try again.'))
      })
      rzp.open()
    })
  }

  // TODO(production): also point Razorpay's dashboard at
  // grafiq-api/razorpay_webhook.php once this is deployed publicly, so
  // payment confirmation doesn't rely solely on the customer's browser
  // staying open through the redirect back from the gateway.
  const handlePlaceOrder = async () => {
    const validationErrors = validateAddress(address)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }
    setErrors({})
    setOrderError('')
    setPlacing(true)
    try {
      if (payment === 'cod') {
        await handleCodOrder()
      } else {
        const result = await handleRazorpayOrder()
        if (result === 'dismissed') setPlacing(false)
      }
    } catch (err) {
      setOrderError(err.message || 'Could not place the order. Please try again.')
      setPlacing(false)
    }
  }

  const hasErrors = Object.keys(errors).length > 0

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
      <h1 className="font-display text-3xl md:text-4xl uppercase mb-8">Checkout</h1>

      <OTPModal open={otpOpen} onClose={() => navigate('/cart')} onSuccess={() => setOtpOpen(false)} />

      {!otpOpen && (
        <div className="grid lg:grid-cols-[1fr_360px] gap-10">
          <div className="flex flex-col gap-10">
            <section>
              <p className="font-accent uppercase tracking-wide text-volt mb-4">1. Shipping Address</p>
              <AddressForm address={address} onChange={setAddress} errors={errors} />
            </section>

            <section>
              <p className="font-accent uppercase tracking-wide text-volt mb-4">2. Payment Method</p>
              <PaymentOptions selected={payment} onSelect={setPayment} />
            </section>
          </div>

          <div className="border border-line p-6 h-fit sticky top-24">
            <p className="font-accent uppercase tracking-wide text-lg mb-5">Order Summary</p>
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto mb-4 pr-1">
              {items.map((item) => (
                <div key={item.lineId} className="flex justify-between text-sm">
                  <span className="text-slate truncate pr-2">
                    {item.name} × {item.qty}
                  </span>
                  <span>{formatPrice(item.price * item.qty, settings.currencySymbol)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-line pt-4 flex flex-col gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate">Subtotal</span>
                <span>{formatPrice(subtotal, settings.currencySymbol)}</span>
              </div>
              {discountTotal > 0 && (
                <div className="flex justify-between text-volt">
                  <span>Discount</span>
                  <span>-{formatPrice(discountTotal, settings.currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate">Delivery</span>
                <span>{deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee, settings.currencySymbol)}</span>
              </div>
            </div>
            <div className="border-t border-line mt-3 pt-3 flex justify-between font-accent text-xl">
              <span>Total</span>
              <span className="text-volt">{formatPrice(total, settings.currencySymbol)}</span>
            </div>
            <Button
              variant="primary"
              size="lg"
              className="w-full mt-6"
              disabled={placing}
              onClick={handlePlaceOrder}
            >
              {placing
                ? payment === 'cod' ? 'Placing Order…' : 'Waiting for Payment…'
                : payment === 'cod' ? 'Place Order' : `Pay ${formatPrice(total, settings.currencySymbol)}`}
            </Button>
            {hasErrors && (
              <p className="text-red-400 text-xs mt-2 text-center">
                Please fix the highlighted fields above.
              </p>
            )}
            {orderError && (
              <p className="text-red-400 text-xs mt-2 text-center">{orderError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
