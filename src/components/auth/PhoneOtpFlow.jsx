import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import Button from '../ui/Button'

export default function PhoneOtpFlow({ onSuccess }) {
  const { sendOtp, verifyOtp, pendingPhone, otpSentAt } = useAuth()
  const [step, setStep] = useState('phone') // 'phone' | 'otp'
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState(['', '', '', ''])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resendIn, setResendIn] = useState(0)
  const [demoOtp, setDemoOtp] = useState('')
  const inputsRef = useRef([])

  useEffect(() => {
    if (step !== 'otp' || resendIn <= 0) return
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [step, resendIn])

  const handleSendOtp = async (e) => {
    e.preventDefault()
    setError('')
    if (!/^\d{10}$/.test(phone)) {
      setError('Enter a valid 10-digit mobile number.')
      return
    }
    setLoading(true)
    const res = await sendOtp(phone)
    setLoading(false)
    setDemoOtp(res.demoOtp || '')
    setStep('otp')
    setResendIn(30)
  }

  const handleChangeDigit = (idx, val) => {
    if (!/^\d?$/.test(val)) return
    const next = [...code]
    next[idx] = val
    setCode(next)
    if (val && idx < 3) inputsRef.current[idx + 1]?.focus()
  }

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    const fullCode = code.join('')
    if (fullCode.length < 4) {
      setError('Enter the full 4-digit code.')
      return
    }
    setLoading(true)
    const res = await verifyOtp(fullCode)
    setLoading(false)
    if (res.success) {
      onSuccess?.()
    } else {
      setError(res.message)
    }
  }

  if (step === 'phone') {
    return (
      <motion.form
        onSubmit={handleSendOtp}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div>
          <label className="text-xs text-slate uppercase tracking-wide font-accent">
            Mobile number
          </label>
          <div className="flex items-center border border-line mt-1.5 focus-within:border-volt">
            <span className="px-3 text-slate border-r border-line">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              placeholder="98765 43210"
              className="flex-1 bg-transparent px-3 py-3 outline-none"
            />
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <Button type="submit" variant="primary" disabled={loading} className="w-full">
          {loading ? 'Sending OTP…' : 'Send OTP'}
        </Button>
        <p className="text-xs text-slate">
          By continuing you agree to GRAFIQ's Terms & Privacy Policy.
        </p>
      </motion.form>
    )
  }

  return (
    <motion.form
      onSubmit={handleVerify}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4"
    >
      <div>
        <p className="text-sm text-slate">
          Enter the 4-digit code sent to <span className="text-paper">+91 {pendingPhone}</span>
        </p>
        {demoOtp && (
          <p className="text-xs text-volt mt-1">
            Demo mode — your OTP is <strong>{demoOtp}</strong>
          </p>
        )}
      </div>
      <div className="flex gap-3">
        {code.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => (inputsRef.current[idx] = el)}
            value={digit}
            onChange={(e) => handleChangeDigit(idx, e.target.value)}
            maxLength={1}
            inputMode="numeric"
            className="w-12 h-14 text-center text-xl bg-transparent border border-line focus:border-volt outline-none"
          />
        ))}
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button type="submit" variant="primary" disabled={loading} className="w-full">
        {loading ? 'Verifying…' : 'Verify & Continue'}
      </Button>
      <button
        type="button"
        disabled={resendIn > 0}
        onClick={handleSendOtp}
        className="text-sm text-slate disabled:opacity-50 hover:text-volt text-left"
      >
        {resendIn > 0 ? `Resend OTP in ${resendIn}s` : 'Resend OTP'}
      </button>
    </motion.form>
  )
}
