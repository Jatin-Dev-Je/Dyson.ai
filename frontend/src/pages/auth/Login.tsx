import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { OAuthButton } from '@/components/shared/OAuthButton'
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
  const [errors,   setErrors]   = useState({ email: '', password: '' })

  function validate() {
    const e = !email.includes('@') ? 'Enter a valid email' : ''
    const p = !password             ? 'Password is required' : ''
    setErrors({ email: e, password: p })
    return !e && !p
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    setApiError(null)
    try {
      await authApi.login(email, password)
      navigate(from, { replace: true })
    } catch (err) {
      setApiError(
        err instanceof ApiError && err.code === 'INVALID_CREDENTIALS'
          ? 'Incorrect email or password.'
          : err instanceof ApiError ? err.message : 'Something went wrong — try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="px-8 pt-8 pb-7">

        {/* Header */}
        <div className="mb-7">
          <h1 className="text-[22px] font-semibold text-ink-1 tracking-tight mb-1">Welcome back</h1>
          <p className="text-[13.5px] text-ink-3">Sign in to your Dyson workspace</p>
        </div>

        {/* OAuth */}
        <div className="space-y-2.5 mb-6">
          <OAuthButton provider="google" />
          <OAuthButton provider="github" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-line" />
          <span className="text-[12px] text-ink-4 font-medium">or</span>
          <div className="flex-1 h-px bg-line" />
        </div>

        {/* Error */}
        {apiError && (
          <div className="mb-5 flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-red-50 border border-red-200">
            <div className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 flex-shrink-0" />
            <p className="text-[12.5px] text-danger leading-relaxed">{apiError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">

          {/* Email */}
          <div>
            <label className="block text-[12px] font-medium text-ink-2 mb-1.5">Email address</label>
            <input
              type="email" autoComplete="email" autoFocus
              placeholder="you@company.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })) }}
              className={cn(
                'w-full h-10 px-3.5 rounded-lg border bg-white text-[13.5px] text-ink-1 placeholder:text-ink-4',
                'outline-none transition-all',
                errors.email
                  ? 'border-danger/60 ring-2 ring-danger/10'
                  : 'border-line hover:border-line-strong focus:border-primary/60 focus:ring-2 focus:ring-primary/10'
              )}
            />
            {errors.email && <p className="text-[11.5px] text-danger mt-1.5">{errors.email}</p>}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[12px] font-medium text-ink-2">Password</label>
              <Link to="/forgot-password"
                className="text-[12px] text-ink-3 hover:text-primary transition-colors">
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
                  'w-full h-10 px-3.5 pr-11 rounded-lg border bg-white text-[13.5px] text-ink-1 placeholder:text-ink-4',
                  'outline-none transition-all',
                  errors.password
                    ? 'border-danger/60 ring-2 ring-danger/10'
                    : 'border-line hover:border-line-strong focus:border-primary/60 focus:ring-2 focus:ring-primary/10'
                )}
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors">
                {showPw ? <EyeOff className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
              </button>
            </div>
            {errors.password && <p className="text-[11.5px] text-danger mt-1.5">{errors.password}</p>}
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-primary text-[13.5px] font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              : 'Sign in'}
          </button>
        </form>
      </div>

      {/* Card footer */}
      <div className="px-8 py-4 border-t border-line bg-[#FAFAF8] text-center">
        <p className="text-[13px] text-ink-3">
          No account yet?{' '}
          <Link to="/signup" className="text-primary font-medium hover:text-primary-hover transition-colors">
            Create one free
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
