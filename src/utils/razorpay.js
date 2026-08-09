// Razorpay's checkout modal comes from a script they host — this loads
// it on demand (only when someone actually reaches the payment step)
// rather than adding it to index.html for every page.
let loadPromise = null

export function loadRazorpayScript() {
  if (window.Razorpay) return Promise.resolve(true)
  if (loadPromise) return loadPromise

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => {
      loadPromise = null
      reject(new Error('Could not load the Razorpay checkout script. Check your internet connection.'))
    }
    document.body.appendChild(script)
  })

  return loadPromise
}
