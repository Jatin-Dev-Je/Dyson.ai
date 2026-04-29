import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { authApi, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from     = (location.state as { from?: string } | null)?.from ?? '/app'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [errors,   setErrors]   = useState<{ email: string; password: string }>({
    email:    '',
    password: '',
  })

  function validate() {
    const emailErr    = !email.includes('@') ? 'Enter a valid email address' : ''
    const passwordErr = password.length < 1  ? 'Password is required'       : ''
    setErrors({ email: emailErr, password: passwordErr })
    return !emailErr && !passwordErr
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setApiError(null)
    try {
      await authApi.login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setApiError(
          err.code === 'INVALID_CREDENTIALS'
            ? 'Incorrect email or password.'
            : err.message
        )
      } else {
        setApiError('Something went wrong — please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Dyson workspace."
    >
      {/* API error */}
      {apiError && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 px-3.5 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-[12.5px] text-red-400"
        >
          {apiError}
        </motion.div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">

        {/* Email */}
        <div>
          <label className="block text-[12px] font-medium text-white/50 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="alex@company.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })) }}
            className={cn(
              'w-full h-10 px-3.5 rounded-xl border bg-white/[0.03] text-[13.5px] text-white placeholder:text-white/20',
              'outline-none transition-all duration-150',
              'focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/25',
              errors.email
                ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/15'
                : 'border-white/[0.08] focus:border-primary/50'
            )}
          />
          {errors.email && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-400 mt-1.5">{errors.email}</motion.p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-medium text-white/50">Password</label>
            <Link
              to="/forgot-password"
              className="text-[11.5px] text-white/30 hover:text-white/60 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })) }}
              className={cn(
                'w-full h-10 px-3.5 pr-10 rounded-xl border bg-white/[0.03] text-[13.5px] text-white placeholder:text-white/20',
                'outline-none transition-all duration-150',
                'focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/25',
                errors.password
                  ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/15'
                  : 'border-white/[0.08] focus:border-primary/50'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-400 mt-1.5">{errors.password}</motion.p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-[13.5px] font-medium text-white hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-[0_0_24px_rgba(99,102,241,0.3)] mt-1"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Sign up link */}
      <p className="text-[12.5px] text-white/30 mt-7 text-center">
        Don't have an account?{' '}
        <Link to="/signup" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">
          Create one free
        </Link>
      </p>
    </AuthLayout>
  )
}
