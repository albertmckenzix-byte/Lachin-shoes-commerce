import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export default function AdminLoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(username, password)
      navigate('/admin/products')
    } catch (err) {
      setError(err.message || 'خطا در ورود')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      dir="rtl"
      className="flex min-h-screen items-center justify-center bg-[#F6F6F4] px-4"
      style={{ fontFamily: "'Vazirmatn Variable', 'Inter', system-ui, sans-serif" }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[380px] rounded-lg border border-[#E6E6E3] bg-white p-8"
      >
        <h1 className="mb-6 text-[22px] font-bold text-[#111]">
          ورود به پنل مدیریت
        </h1>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm text-[#111]">
            نام کاربری
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoComplete="username"
              className="h-[42px] rounded-md border border-[#D9D9D6] px-3 text-sm outline-none focus:border-[#111]"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm text-[#111]">
            رمز عبور
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="h-[42px] rounded-md border border-[#D9D9D6] px-3 text-sm outline-none focus:border-[#111]"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-md bg-black text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? 'در حال ورود…' : 'ورود'}
          </button>
        </div>
      </form>
    </div>
  )
}
