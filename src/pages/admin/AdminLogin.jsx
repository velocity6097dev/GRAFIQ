import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import Button from '../../components/ui/Button'
import logo from '../../assets/logo.png'

export default function AdminLogin() {
  const { isAdmin, adminLogin } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  if (isAdmin) return <Navigate to="/admin" replace />

  const handleSubmit = (e) => {
    e.preventDefault()
    if (adminLogin(username, password)) {
      navigate('/admin')
    } else {
      setError('Incorrect username or password.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-ink px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm border border-line p-8">
        <img src={logo} alt="GRAFIQ" className="h-9 w-auto mb-2" />
        <p className="text-slate text-sm mb-6">Admin panel — sign in to manage your store.</p>
        <div className="flex flex-col gap-4">
          <input
            className="bg-transparent border border-paper/25 focus:border-volt outline-none px-3 py-2.5"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            className="bg-transparent border border-paper/25 focus:border-volt outline-none px-3 py-2.5"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <Button type="submit" variant="primary" className="w-full">Sign In</Button>
          <p className="text-xs text-slate">
            Demo credentials: <span className="text-paper">admin / admin123</span>
          </p>
        </div>
      </form>
    </div>
  )
}
