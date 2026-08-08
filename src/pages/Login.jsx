import { useNavigate } from 'react-router-dom'
import PhoneOtpFlow from '../components/auth/PhoneOtpFlow'

export default function Login() {
  const navigate = useNavigate()

  return (
    <div className="max-w-sm mx-auto px-4 py-20">
      <p className="font-accent text-volt tracking-widest text-sm mb-2 uppercase text-center">
        Welcome back
      </p>
      <h1 className="font-display text-3xl uppercase text-center mb-8">Log In</h1>
      <PhoneOtpFlow onSuccess={() => navigate('/account')} />
    </div>
  )
}
