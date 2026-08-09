// Talks to the grafiq-api PHP backend (see /grafiq-api at the project
// root — copy that folder into your XAMPP htdocs and import schema.sql).
//
// Base URL comes from VITE_API_URL (see .env). Defaults to the standard
// XAMPP "htdocs/grafiq-api" layout on Windows/Mac/Linux, i.e. Apache
// serving PHP on port 80 at http://localhost/grafiq-api.
const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost/grafiq-api').replace(/\/$/, '')

async function request(path, options = {}) {
  let res
  try {
    res = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options
    })
  } catch (err) {
    // Preserve AbortError as-is (e.g. React StrictMode cleaning up a
    // superseded request) — callers need to tell "cancelled on purpose"
    // apart from "couldn't actually reach the server".
    if (err.name === 'AbortError') throw err
    throw new Error(
      `Could not reach the API at ${API_BASE}. Is XAMPP's Apache + MySQL running, and is grafiq-api in htdocs?`
    )
  }

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error('The API returned a non-JSON response (check the PHP error log).')
    }
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
