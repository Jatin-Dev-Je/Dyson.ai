import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { authApi, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-medium text-ink-2 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[11px] text-danger mt-1">{error}</p>}
    </div>
  )
}

function Input({ error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={cn(
        'w-full h-9 px-3 rounded-md border text-[13px] text-ink-1 bg-surface placeholder:text-ink-4',
        'outline-none transition-all',
        error
          ? 'border-danger/50 focus:border-danger focus:ring-2 focus:ring-danger/10'
          : 'border-line hover:border-line-strong focus:border-primary/50 focus:ring-2 focus:ring-primary/10'
      )}
    />
  )
}

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
    const p = !password ? 'Password is required' : ''
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
      setApiError(err instanceof ApiError && err.code === 'INVALID_CREDENTIALS'
        ? 'Incorrect email or password.'
        : (err instanceof ApiError ? err.message : 'Something went wrong — please try again.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your Dyson workspace.">
      {apiError && (
        <div className="mb-4 px-3 py-2.5 rounded-md bg-red-50 border border-red-200 text-[12.5px] text-danger">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Email" error={errors.email}>
          <Input
            type="email" autoComplete="email" autoFocus
            placeholder="you@company.com"
            value={email} error={!!errors.email}
            onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })) }}
          />
        </Field>

        <Field label="Password" error={errors.password}>
          <div className="relative">
            <Input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              value={password} error={!!errors.password}
              onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })) }}
              className="pr-9"
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <div className="flex justify-end mt-1">
            <Link to="/forgot-password" className="text-[11.5px] text-ink-3 hover:text-ink-2 transition-colors">
              Forgot password?
            </Link>
          </div>
        </Field>

        <button type="submit" disabled={loading}
          className="w-full h-9 flex items-center justify-center gap-2 rounded-md bg-primary text-[13px] font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm mt-1">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in…</>
            : <><span>Sign in</span><ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>

      <p className="text-[12.5px] text-ink-3 mt-6 text-center">
        Don't have an account?{' '}
        <Link to="/signup" className="text-primary hover:text-primary-hover font-medium transition-colors">
          Create one free
        </Link>
      </p>
    </AuthLayout>
  )
}
