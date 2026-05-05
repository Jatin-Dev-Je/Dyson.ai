import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Check, ChevronRight } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { OAuthButton } from '@/components/shared/OAuthButton'
import { authApi, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

// ─── Helpers ──────────────────────────────────────────────────────────────

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

// ─── Password strength ────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9!@#$%^&*]/.test(password)]
  const score  = checks.filter(Boolean).length
  const color  = ['#EF4444', '#F59E0B', '#22C55E'][score - 1] ?? '#E5E7EB'
  const label  = ['Weak', 'Fair', 'Strong'][score - 1] ?? 'Too short'
  return (
    <div className="mt-2 flex items-center gap-3">
      <div className="flex gap-1 flex-1">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex-1 h-[3px] rounded-full transition-all duration-300"
            style={{ background: i < score ? color : '#E8E7E5' }} />
        ))}
      </div>
      <span className="text-[11px] font-medium flex-shrink-0" style={{ color: score ? color : '#9b9b9b' }}>
        {label}
      </span>
    </div>
  )
}

// ─── Field wrapper ─────────────────────────────────────────────────────────

function Field({ label, error, hint, children }: {
  label: string; error?: string | undefined; hint?: string | undefined; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[12px] font-medium text-[#525252]">{label}</label>
        {hint && <span className="text-[11px] text-[#9b9b9b]">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="text-[11.5px] text-[#EF4444] mt-1 flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-[#EF4444] inline-block flex-shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────

function Input({
  type = 'text', value, onChange, placeholder, autoFocus, autoComplete,
  prefix, readOnly, hasError,
}: {
  type?: string; value: string; onChange?: (v: string) => void
  placeholder?: string; autoFocus?: boolean; autoComplete?: string
  prefix?: string; readOnly?: boolean; hasError?: boolean
}) {
  const [show, setShow] = useState(false)
  const isPw = type === 'password'

  return (
    <div className={cn(
      'flex items-center h-10 rounded-lg border bg-white transition-all',
      hasError
        ? 'border-[#EF4444]/50 ring-2 ring-[#EF4444]/10'
        : readOnly
        ? 'border-[#E8E7E5] bg-[#FAFAF9]'
        : 'border-[#E8E7E5] hover:border-[#C8C7C5] focus-within:border-[#5B5BD6]/60 focus-within:ring-2 focus-within:ring-[#5B5BD6]/10'
    )}>
      {prefix && (
        <span className="pl-3 pr-0.5 text-[13px] text-[#9b9b9b] select-none flex-shrink-0 leading-none">
          {prefix}
        </span>
      )}
      <input
        type={isPw ? (show ? 'text' : 'password') : type}
        value={value}
        onChange={e => onChange?.(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        autoComplete={autoComplete}
        readOnly={readOnly}
        className={cn(
          'flex-1 h-full bg-transparent text-[13.5px] outline-none min-w-0',
          prefix ? 'pl-0.5 pr-3' : 'px-3',
          isPw && 'pr-10',
          readOnly ? 'text-[#9b9b9b] cursor-default' : 'text-[#1a1a1a] placeholder:text-[#b8b8b8]'
        )}
      />
      {isPw && (
        <button type="button" onClick={() => setShow(v => !v)} tabIndex={-1}
          className="w-9 flex items-center justify-center text-[#9b9b9b] hover:text-[#525252] transition-colors flex-shrink-0">
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      )}
    </div>
  )
}

// ─── Signup page ──────────────────────────────────────────────────────────

export default function Signup() {
  const navigate = useNavigate()

  const [name,          setName]          = useState('')
  const [email,         setEmail]         = useState('')
  const [password,      setPassword]      = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceSlug, setWorkspaceSlug] = useState('')
  const [slugTouched,   setSlugTouched]   = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [apiError,      setApiError]      = useState<string | null>(null)
  const [errors,        setErrors]        = useState<Record<string, string | undefined>>({})

  function clearError(key: string) {
    setErrors(prev => ({ ...prev, [key]: undefined }))
  }

  function handleWorkspaceName(val: string) {
    setWorkspaceName(val)
    clearError('workspaceName')
    if (!slugTouched) setWorkspaceSlug(toSlug(val))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())                              e.name          = 'Name is required'
    if (!email.includes('@'))                      e.email         = 'Enter a valid email'
    if (password.length < 8)                       e.password      = 'At least 8 characters'
    if (!workspaceName.trim())                     e.workspaceName = 'Workspace name is required'
    if (!/^[a-z0-9-]{2,50}$/.test(workspaceSlug)) e.workspaceSlug = 'Only lowercase letters, numbers, hyphens'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!validate()) return
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
        setErrors(v => ({ ...v, workspaceSlug: 'This URL is taken — try another' }))
      } else {
        setApiError(err instanceof ApiError ? err.message : 'Something went wrong — please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const slugPreview = workspaceSlug
    ? <span className="text-[#5B5BD6] font-medium">{workspaceSlug}</span>
    : <span className="text-[#b8b8b8]">your-workspace</span>

  return (
    <AuthLayout wide>

      {/* ── Card body ─────────────────────────────────────────── */}
      <div className="px-8 pt-8 pb-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold text-[#1a1a1a] tracking-tight leading-tight mb-1">
            Create your account
          </h1>
          <p className="text-[13.5px] text-[#6b6b6b]">
            Set up Dyson for your engineering team. Free to start.
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <OAuthButton provider="google" />
          <OAuthButton provider="github" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-[#E8E7E5]" />
          <span className="text-[12px] text-[#b0b0b0] font-medium">or with email</span>
          <div className="flex-1 h-px bg-[#E8E7E5]" />
        </div>

        {/* API error */}
        {apiError && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-start gap-2.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#EF4444] mt-1.5 flex-shrink-0" />
            <p className="text-[12.5px] text-[#DC2626] leading-relaxed">{apiError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-4">

            {/* Row 1: Name + Email */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full name" error={errors.name}>
                <Input value={name} placeholder="Alex Kumar" autoFocus
                  hasError={!!errors.name}
                  onChange={v => { setName(v); clearError('name') }} />
              </Field>

              <Field label="Work email" error={errors.email}>
                <Input type="email" value={email} placeholder="alex@company.com"
                  autoComplete="email" hasError={!!errors.email}
                  onChange={v => { setEmail(v); clearError('email') }} />
              </Field>
            </div>

            {/* Password */}
            <Field label="Password" error={errors.password}>
              <Input type="password" value={password} placeholder="Min. 8 characters"
                autoComplete="new-password" hasError={!!errors.password}
                onChange={v => { setPassword(v); clearError('password') }} />
              <PasswordStrength password={password} />
            </Field>

            {/* Workspace section */}
            <div className="rounded-xl border border-[#E8E7E5] bg-[#FAFAF9] p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-4 h-4 rounded bg-[#5B5BD6] flex items-center justify-center flex-shrink-0">
                  <span className="text-[8px] font-bold text-white">W</span>
                </div>
                <span className="text-[12px] font-semibold text-[#525252]">Workspace</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Name" error={errors.workspaceName}>
                  <Input value={workspaceName} placeholder="Acme Engineering"
                    hasError={!!errors.workspaceName}
                    onChange={handleWorkspaceName} />
                </Field>

                <Field label="URL slug" error={errors.workspaceSlug}>
                  <Input value={workspaceSlug} placeholder="acme-eng"
                    prefix="dyson.ai/" hasError={!!errors.workspaceSlug}
                    onChange={v => {
                      setSlugTouched(true)
                      setWorkspaceSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      clearError('workspaceSlug')
                    }} />
                </Field>
              </div>

              {/* Slug preview */}
              {(workspaceName || workspaceSlug) && !errors.workspaceSlug && (
                <p className="text-[11.5px] text-[#9b9b9b] mt-2.5 flex items-center gap-1">
                  <ChevronRight className="w-3 h-3 flex-shrink-0" />
                  Your workspace URL: <span className="font-mono ml-0.5">dyson.ai/{slugPreview}</span>
                </p>
              )}
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-[#5B5BD6] text-[14px] font-medium text-white hover:bg-[#4F4FBF] active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</>
                : 'Create account'}
            </button>
          </div>
        </form>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-5 mt-5 pt-5 border-t border-[#E8E7E5]">
          {['Free for 5 users', 'No credit card', '5-min setup'].map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <Check className="w-3.5 h-3.5 text-[#22C55E] flex-shrink-0" />
              <span className="text-[12px] text-[#9b9b9b]">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Card footer ───────────────────────────────────────── */}
      <div className="px-8 py-4 border-t border-[#F0EFED] bg-[#FAFAF8] text-center">
        <p className="text-[13px] text-[#9b9b9b]">
          Already have an account?{' '}
          <Link to="/login" className="text-[#5B5BD6] font-medium hover:text-[#4F4FBF] transition-colors">
            Sign in
          </Link>
        </p>
      </div>

    </AuthLayout>
  )
}
