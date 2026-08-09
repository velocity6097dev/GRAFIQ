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
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: (path) => request(path, { method: 'DELETE' })
}

export { API_BASE }
