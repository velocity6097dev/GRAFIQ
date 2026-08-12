// Talks to the grafiq-api PHP backend. For local dev, copy /grafiq-api
// into your XAMPP htdocs and import schema.sql; VITE_API_URL in .env
// points this at wherever it's actually deployed (InfinityFree or any
// other host, once this is live).
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost/grafiq-api').replace(/\/$/, '')
const IS_LOCAL_API = /localhost|127\.0\.0\.1/.test(API_BASE)

// AuthContext writes these two keys via useLocalStorage (which JSON.stringifies
// even plain strings) whenever an admin logs in / a customer verifies their
// OTP — read directly here rather than through React so a plain module-level
// object (this file) can attach them to every request without needing
// context access. Cleared the same way on logout.
function readToken(key) {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Shared hosting (InfinityFree and similar free tiers especially) can
// have brief MySQL hiccups on the backend — a connection-limit blip, a
// restart — where the exact same request a second later succeeds fine.
// grafiq-api/config.php already retries the DB connection itself and
// marks that kind of failure `transient: true` in its JSON error body
// instead of a raw 500; retrying here too (plus once for a genuine
// network-level failure, which covers the same class of blip one layer
// up) is what turns "refresh the page and it works" into something that
// just resolves on its own, invisibly, before ever reaching the person
// as an error.
//
// Only ever auto-retried for GET — a lost response to a POST/PUT/DELETE
// can't be told apart from "it actually went through and only the
// response got lost", and silently retrying something like order
// creation risks placing it twice. Those still surface the error
// immediately with a "please try again" message instead.
const MAX_TRANSIENT_RETRIES = 2
const RETRY_DELAY_MS = 700

async function request(path, options = {}, attempt = 1) {
  let res
  const method = (options.method || 'GET').toUpperCase()
  const isRetryable = method === 'GET'
  const adminToken = readToken('grafiq_admin_token')
  const customerToken = readToken('grafiq_customer_token')
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) }
  if (adminToken) headers['X-Admin-Token'] = adminToken
  if (customerToken) headers['X-Customer-Token'] = customerToken

  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    })
  } catch (err) {
    // Preserve AbortError as-is (e.g. React StrictMode cleaning up a
    // superseded request) — callers need to tell "cancelled on purpose"
    // apart from "couldn't actually reach the server".
    if (err.name === 'AbortError') throw err

    if (isRetryable && attempt <= MAX_TRANSIENT_RETRIES) {
      await sleep(RETRY_DELAY_MS * attempt)
      return request(path, options, attempt + 1)
    }

    throw new Error(
      IS_LOCAL_API
        ? `Could not reach the API at ${API_BASE}. Is XAMPP's Apache + MySQL running, and is grafiq-api in htdocs?`
        : `Could not reach the store's server right now — it may be briefly down. Please try again in a moment.`
    )
  }

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      // grafiq-api/config.php always returns valid JSON, even on error —
      // seeing this means something between the browser and PHP (the
      // host's own proxy/CDN, a resource limit killing the request
      // before PHP could respond, etc.) returned its own non-JSON error
      // page instead. Worth one retry for the same reason as above.
      if (isRetryable && attempt <= MAX_TRANSIENT_RETRIES) {
        await sleep(RETRY_DELAY_MS * attempt)
        return request(path, options, attempt + 1)
      }
      throw new Error('The store\'s server sent back an unexpected response. Please try again in a moment.')
    }
  }

  // A graceful failure from config.php's error handling — retry the
  // same way rather than surfacing it immediately.
  if (!res.ok && data?.transient && isRetryable && attempt <= MAX_TRANSIENT_RETRIES) {
    await sleep(RETRY_DELAY_MS * attempt)
    return request(path, options, attempt + 1)
  }

  if (!res.ok) {
    throw new Error(data?.error || `Request to ${path} failed (${res.status}).`)
  }
  return data
}

export const api = {
  get: (path, options = {}) => request(path, options),
  post: (path, body, options = {}) => request(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  put: (path, body, options = {}) => request(path, { method: 'PUT', body: JSON.stringify(body), ...options }),
  del: (path, options = {}) => request(path, { method: 'DELETE', ...options })
}

export { API_BASE }
