import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { OAuthButton } from '@/components/shared/OAuthButton'
import { authApi, ApiError } from '@/lib/api'

function AuthInput({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const [focus, setFocus] = useState(false)
  const [show,  setShow]  = useState(false)
  const isPw = props.type === 'password'

  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#525252', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center', height: 38, padding: '0 12px',
        background: 'white', borderRadius: 8,
        border: `1px solid ${error ? '#F87171' : focus ? 'rgba(91,91,214,0.45)' : '#E8E7E5'}`,
        boxShadow: focus ? '0 0 0 3px rgba(91,91,214,0.10)' : error ? '0 0 0 3px rgba(220,38,38,0.08)' : 'none',
        transition: 'all 120ms',
      }}>
        <input
          {...props}
          type={isPw ? (show ? 'text' : 'password') : props.type}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1, border: 'none', background: 'transparent', outline: 'none',
            fontSize: 13.5, color: '#1a1a1a', minWidth: 0,
          }}
        />
        {isPw && (
          <button type="button" onClick={() => setShow(v => !v)} tabIndex={-1}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9b9b9b', padding: 0, display: 'flex' }}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        )}
      </div>
      {error && <p style={{ fontSize: 11.5, color: '#DC2626', marginTop: 5, marginBottom: 0 }}>{error}</p>}
    </div>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from     = (location.state as { from?: string } | null)?.from ?? '/app'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
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
      <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a', margin: 0, marginBottom: 4 }}>
        Welcome back
      </h2>
      <p style={{ fontSize: 12.5, color: '#9b9b9b', margin: 0, marginBottom: 20 }}>
        Sign in to your workspace.
      </p>

      {/* OAuth buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        <OAuthButton provider="google" />
        <OAuthButton provider="github" />
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 14px' }}>
        <div style={{ flex: 1, height: 1, background: '#E8E7E5' }} />
        <span style={{ fontSize: 10.5, color: '#b0b0b0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>or</span>
        <div style={{ flex: 1, height: 1, background: '#E8E7E5' }} />
      </div>

      {/* Error */}
      {apiError && (
        <div style={{ marginBottom: 14, padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12.5, color: '#DC2626' }}>
          {apiError}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate>
        <AuthInput
          label="Work email" type="email" autoComplete="email" autoFocus
          placeholder="you@company.com"
          value={email} error={errors.email}
          onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })) }}
        />
        <AuthInput
          label="Password" type="password" autoComplete="current-password"
          placeholder="Your password"
          value={password} error={errors.password}
          onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })) }}
        />

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -4, marginBottom: 16 }}>
          <Link to="/forgot-password" style={{ fontSize: 11.5, color: '#5B5BD6', textDecoration: 'none' }}>
            Forgot password?
          </Link>
        </div>

        <button type="submit" disabled={loading}
          style={{
            width: '100%', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: loading ? '#7878e0' : '#5B5BD6', color: 'white',
            border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 500,
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 120ms',
          }}>
          {loading ? <><Loader2 size={14} className="animate-spin" />Signing in…</> : 'Sign in'}
        </button>
      </form>

      <p style={{ textAlign: 'center', fontSize: 12.5, color: '#9b9b9b', marginTop: 18, marginBottom: 0 }}>
        New to Dyson?{' '}
        <Link to="/signup" style={{ color: '#5B5BD6', textDecoration: 'none', fontWeight: 500 }}>
          Create a workspace
        </Link>
      </p>
    </AuthLayout>
  )
}
