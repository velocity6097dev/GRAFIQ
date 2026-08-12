import { createContext, useContext, useEffect, useState } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'
import { api } from '../api/client'

const AuthContext = createContext(null)

// Real server-issued session tokens now — grafiq-api/customer_auth.php's
// verify_otp and grafiq-api/admin_auth.php's login both return a token
// tied to a row in customer_sessions/admin_sessions, which every
// protected endpoint checks server-side (see require_admin()/
// require_customer() in config.php). `grafiq_admin_token` /
// `grafiq_customer_token` are read directly by src/api/client.js and
// sent as X-Admin-Token / X-Customer-Token on every request — this file
// just owns writing/clearing them (+ the `user`/`isAdmin` display state
// that mirrors "is there currently a token").
export function AuthProvider({ children }) {
  const [user, setUser] = useLocalStorage('grafiq_user', null)
  const [customerToken, setCustomerToken] = useLocalStorage('grafiq_customer_token', null)
  const [isAdmin, setIsAdmin] = useLocalStorage('grafiq_is_admin', false)
  const [adminToken, setAdminToken] = useLocalStorage('grafiq_admin_token', null)
  const [pendingPhone, setPendingPhone] = useState(null)
  const [otpSentAt, setOtpSentAt] = useState(null)
  // True once the startup admin-token check below has resolved (or
  // there was no admin token to check at all) — lets AdminLayout hold
  // off rendering the full admin shell until it actually knows whether a
  // stored token is still good, instead of flashing the dashboard for a
  // stale/expired session before the check kicks them back out.
  const [adminAuthChecked, setAdminAuthChecked] = useState(!adminToken)

  // On app load, confirm any stored token is still actually valid
  // server-side (it may have expired, or the DB may have been reset
  // since) — rather than showing a "logged in" UI that then fails
  // confusingly on the first real action. Silently logs out locally if
  // the server says the token's no good; a genuine network hiccup
  // (can't reach the API at all) is left alone rather than logging
  // someone out just because XAMPP hasn't started yet.
  useEffect(() => {
    if (customerToken) {
      api
        .post('/customer_auth.php', { action: 'whoami' })
        .then((res) => res.success && setUser(res.user))
        .catch((err) => {
          if (/session has expired|verify your phone/i.test(err.message || '')) {
            setUser(null)
            setCustomerToken(null)
          }
        })
    }
    if (adminToken) {
      api
        .post('/admin_auth.php', { action: 'verify' })
        .catch((err) => {
          if (/session has expired|sign-in required/i.test(err.message || '')) {
            setIsAdmin(false)
            setAdminToken(null)
          }
        })
        .finally(() => setAdminAuthChecked(true))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sendOtp = async (phone) => {
    const res = await api.post('/customer_auth.php', { action: 'send_otp', phone })
    if (res.success) {
      setPendingPhone(phone)
      setOtpSentAt(Date.now())
    }
    return res
  }

  const verifyOtp = async (code) => {
    const res = await api.post('/customer_auth.php', {
      action: 'verify_otp',
      phone: pendingPhone,
      code
    })
    if (res.success) {
      setUser(res.user)
      setCustomerToken(res.token)
      setPendingPhone(null)
    }
    return res
  }

  const updateProfile = async (patch) => {
    if (!user) return
    const res = await api.post('/customer_auth.php', { action: 'update_profile', ...patch })
    if (res.success) setUser(res.user)
    return res
  }

  const logout = () => {
    if (customerToken) api.post('/customer_auth.php', { action: 'logout' }).catch(() => {})
    setUser(null)
    setCustomerToken(null)
  }

  const adminLogin = async (username, password) => {
    const res = await api.post('/admin_auth.php', { username, password })
    if (res.success) {
      setIsAdmin(true)
      setAdminToken(res.token)
      setAdminAuthChecked(true) // freshly issued — no need to re-verify it
    }
    return res.success
  }

  const adminLogout = () => {
    if (adminToken) api.post('/admin_auth.php', { action: 'logout' }).catch(() => {})
    setIsAdmin(false)
    setAdminToken(null)
    setAdminAuthChecked(true) // no token left = trivially "checked"
  }

  const value = {
    user,
    isAdmin,
    adminAuthChecked,
    pendingPhone,
    otpSentAt,
    sendOtp,
    verifyOtp,
    updateProfile,
    logout,
    adminLogin,
    adminLogout
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
