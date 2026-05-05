import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, ArrowRight, Shield } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { OAuthButton } from '@/components/shared/OAuthButton'
import { authApi, ApiError } from '@/lib/api'

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

function AuthInput({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string | undefined }) {
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
        {(props as { prefix?: string }).prefix && (
          <span style={{ fontSize: 13, color: '#9b9b9b', marginRight: 2, fontFamily: 'monospace' }}>
            {(props as { prefix?: string }).prefix}
          </span>
        )}
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

export default function Signup() {
  const navigate = useNavigate()
  const [step,          setStep]          = useState(1)
  const [name,          setName]          = useState('')
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceSlug, setWorkspaceSlug] = useState('')
  const [slugTouched,   setSlugTouched]   = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [apiError,      setApiError]      = useState<string | null>(null)
  const [errors,        setErrors]        = useState<Record<string, string>>({})

  function validateStep1() {
    const e: Record<string, string> = {}
    if (!name.trim())       e.name     = 'Name is required'
    if (!email.includes('@')) e.email  = 'Enter a valid email'
    if (password.length < 8) e.password = 'At least 8 characters'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function validateStep2() {
    const e: Record<string, string> = {}
    if (!workspaceName.trim())                     e.workspaceName = 'Required'
    if (!/^[a-z0-9-]{2,50}$/.test(workspaceSlug)) e.workspaceSlug = 'Lowercase letters and hyphens only'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function handleWorkspaceName(val: string) {
    setWorkspaceName(val)
    if (!slugTouched) setWorkspaceSlug(toSlug(val))
  }

  function handleContinue() {
    if (!validateStep1()) return
    setStep(2)
  }

  async function handleCreate() {
    if (!validateStep2()) return
    setLoading(true)
    setApiError(null)
    try {
      await authApi.signup({
        name: name.trim(), email: email.trim(), password,
        workspaceName: workspaceName.trim(), workspaceSlug,
      })
      navigate('/app', { replace: true })
    } catch (err) {
      if (err instanceof ApiError && err.code === 'SLUG_TAKEN') {
        setErrors(v => ({ ...v, workspaceSlug: 'This URL is already taken' }))
      } else {
        setApiError(err instanceof ApiError ? err.message : 'Something went wrong — try again.')
        setStep(1)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>

      {/* Progress bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
        {[1, 2].map(n => (
          <div key={n} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: step >= n ? '#5B5BD6' : '#E8E7E5',
            transition: 'background 200ms',
          }} />
        ))}
      </div>

      <h2 style={{ fontSize: 17, fontWeight: 600, color: '#1a1a1a', margin: 0, marginBottom: 4 }}>
        {step === 1 ? 'Create your account' : 'Name your workspace'}
      </h2>
      <p style={{ fontSize: 12.5, color: '#9b9b9b', margin: 0, marginBottom: 20 }}>
        {step === 1
          ? 'Start capturing memories in 60 seconds.'
          : 'You can invite teammates and connect sources next.'}
      </p>

      {apiError && (
        <div style={{ marginBottom: 14, padding: '10px 12px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, fontSize: 12.5, color: '#DC2626' }}>
          {apiError}
        </div>
      )}

      {step === 1 && (
        <>
          {/* OAuth */}
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

          <AuthInput label="Full name" placeholder="Alex Chen" autoFocus
            value={name} error={errors.name}
            onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: '' })) }} />
          <AuthInput label="Work email" type="email" placeholder="you@company.com"
            value={email} error={errors.email}
            onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })) }} />
          <AuthInput label="Password" type="password" placeholder="At least 8 characters"
            value={password} error={errors.password}
            onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })) }} />

          <button type="button" onClick={handleContinue}
            style={{
              width: '100%', height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: '#5B5BD6', color: 'white', border: 'none', borderRadius: 8,
              fontSize: 13.5, fontWeight: 500, cursor: 'pointer', marginTop: 6, transition: 'background 120ms',
            }}>
            Continue <ArrowRight size={13} />
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <AuthInput label="Workspace name" placeholder="Acme Engineering" autoFocus
            value={workspaceName} error={errors.workspaceName}
            onChange={e => { handleWorkspaceName(e.target.value); setErrors(v => ({ ...v, workspaceName: '' })) }} />

          <AuthInput label="Workspace URL" placeholder="acme-eng"
            value={workspaceSlug} error={errors.workspaceSlug}
            onChange={e => {
              setSlugTouched(true)
              setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
              setErrors(v => ({ ...v, workspaceSlug: '' }))
            }} />

          {/* Security note */}
          <div style={{
            fontSize: 11.5, color: '#8B8985',
            background: '#F5F4F1', border: '1px solid #EFEDE9',
            borderRadius: 8, padding: '10px 12px', marginBottom: 16,
            display: 'flex', alignItems: 'flex-start', gap: 8,
          }}>
            <Shield size={12} style={{ color: '#9b9b9b', marginTop: 1, flexShrink: 0 }} />
            <span>Memories stay scoped to your workspace. Encrypted at rest with per-workspace keys.</span>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setStep(1)}
              style={{
                flex: 1, height: 38, background: 'white', color: '#1a1a1a',
                border: '1px solid #E8E7E5', borderRadius: 8,
                fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all 120ms',
              }}>
              Back
            </button>
            <button type="button" onClick={handleCreate} disabled={loading}
              style={{
                flex: 2, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: loading ? '#7878e0' : '#5B5BD6', color: 'white',
                border: 'none', borderRadius: 8, fontSize: 13.5, fontWeight: 500,
                cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 120ms',
              }}>
              {loading ? <><Loader2 size={14} className="animate-spin" />Creating…</> : 'Create workspace'}
            </button>
          </div>
        </>
      )}

      <p style={{ textAlign: 'center', fontSize: 12.5, color: '#9b9b9b', marginTop: 18, marginBottom: 0 }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: '#5B5BD6', textDecoration: 'none', fontWeight: 500 }}>
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
