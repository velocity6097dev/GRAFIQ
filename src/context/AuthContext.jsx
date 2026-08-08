import { createContext, useContext, useState } from 'react'
import useLocalStorage from '../hooks/useLocalStorage'

const AuthContext = createContext(null)

// Demo OTP — every phone number receives this same code in dev mode so the
// flow can be tested without a real SMS gateway.
// TODO(production): replace sendOtp/verifyOtp with calls to your backend,
// which should talk to Firebase Phone Auth, MSG91, Twilio Verify, etc.
const DEMO_OTP = '1234'

export function AuthProvider({ children }) {
  const [user, setUser] = useLocalStorage('grafiq_user', null)
  const [isAdmin, setIsAdmin] = useLocalStorage('grafiq_is_admin', false)
  const [pendingPhone, setPendingPhone] = useState(null)
  const [otpSentAt, setOtpSentAt] = useState(null)

  const sendOtp = (phone) =>
    new Promise((resolve) => {
      setPendingPhone(phone)
      setOtpSentAt(Date.now())
      // Simulated network delay
      setTimeout(() => resolve({ success: true, demoOtp: DEMO_OTP }), 600)
    })

  const verifyOtp = (code) =>
    new Promise((resolve) => {
      setTimeout(() => {
        if (code === DEMO_OTP && pendingPhone) {
          const newUser = { phone: pendingPhone, name: '', loggedInAt: Date.now() }
          setUser(newUser)
          setPendingPhone(null)
          resolve({ success: true })
        } else {
          resolve({ success: false, message: 'Incorrect code. Try again.' })
        }
      }, 500)
    })

  const updateProfile = (patch) => setUser((prev) => (prev ? { ...prev, ...patch } : prev))

  const logout = () => setUser(null)

  // Simple hardcoded admin gate for the demo. Swap for real auth in production.
  const ADMIN_USERNAME = 'admin'
  const ADMIN_PASSWORD = 'admin123'

  const adminLogin = (username, password) => {
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      setIsAdmin(true)
      return true
    }
    return false
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
