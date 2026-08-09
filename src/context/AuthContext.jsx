import { createContext, useContext, useState } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'
import { api } from '../api/client'

const AuthContext = createContext(null)

// The OTP itself is still a demo code (see grafiq-api/customer_auth.php —
// that's the one place to swap in a real SMS gateway later). What's
// different from before is that verified customers are now persisted as
// rows in the `customers` MySQL table instead of only existing in
// localStorage. The logged-in session (which customer/admin is "active on
// this browser") is still cached in localStorage, same as before — that
// part doesn't need a database, it's just this browser's state.
export function AuthProvider({ children }) {
  const [user, setUser] = useLocalStorage('grafiq_user', null)
  const [isAdmin, setIsAdmin] = useLocalStorage('grafiq_is_admin', false)
  const [pendingPhone, setPendingPhone] = useState(null)
  const [otpSentAt, setOtpSentAt] = useState(null)

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
      setPendingPhone(null)
    }
    return res
  }

  const updateProfile = async (patch) => {
    if (!user) return
    const res = await api.post('/customer_auth.php', {
      action: 'update_profile',
      phone: user.phone,
      ...patch
    })
    if (res.success) setUser(res.user)
    return res
  }

  const logout = () => setUser(null)

  const adminLogin = async (username, password) => {
    const res = await api.post('/admin_auth.php', { username, password })
    if (res.success) setIsAdmin(true)
    return res.success
  }

  const adminLogout = () => setIsAdmin(false)

  const value = {
    user,
    isAdmin,
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
