import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { OAuthButton } from '@/components/shared/OAuthButton'
import { authApi, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9!@#$%]/.test(password)]
  const score   = checks.filter(Boolean).length
  const bars    = ['bg-danger', 'bg-warning', 'bg-success']
  const labels  = ['Weak', 'Fair', 'Strong']
  const colors  = ['text-danger', 'text-warning', 'text-success']
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1.5">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn('flex-1 h-[3px] rounded-full transition-all duration-300',
            i < score ? bars[score - 1] : 'bg-line')} />
        ))}
      </div>
      <p className={cn('text-[11px] font-medium', colors[score - 1] ?? 'text-ink-4')}>
        {labels[score - 1] ?? 'Too short'}
      </p>
    </div>
  )
}

function InputField({
  label, placeholder, type = 'text', value, onChange, error, autoFocus, prefix, readOnly, hint, autoComplete,
}: {
  label: string; placeholder?: string; type?: string; value: string
  onChange?: (v: string) => void; error?: string | undefined; autoFocus?: boolean
  prefix?: string; readOnly?: boolean; hint?: string | undefined; autoComplete?: string
}) {
  const [showPw, setShowPw] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword ? (showPw ? 'text' : 'password') : type

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[12px] font-medium text-ink-2">{label}</label>
        {hint && <span className="text-[11px] text-ink-4">{hint}</span>}
      </div>
      <div className={cn('flex items-center rounded-lg border bg-white transition-all overflow-hidden',
        error ? 'border-danger/60 ring-2 ring-danger/10' : 'border-line hover:border-line-strong focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/10'
      )}>
        {prefix && (
          <span className="pl-3.5 pr-1 text-[13px] text-ink-4 select-none flex-shrink-0">{prefix}</span>
        )}
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          readOnly={readOnly}
          autoFocus={autoFocus}
          autoComplete={autoComplete}
          onChange={e => onChange?.(e.target.value)}
          className={cn(
            'flex-1 h-10 px-3.5 bg-transparent text-[13.5px] text-ink-1 placeholder:text-ink-4 outline-none',
            prefix && 'pl-0',
            readOnly && 'text-ink-3 cursor-default',
            isPassword && 'pr-11'
          )}
        />
        {isPassword && (
          <button type="button" onClick={() => setShowPw(v => !v)}
            className="absolute right-3.5 text-ink-4 hover:text-ink-2 transition-colors">
            {showPw ? <EyeOff className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
          </button>
        )}
      </div>
      {error && <p className="text-[11.5px] text-danger mt-1.5">{error}</p>}
    </div>
  )
}

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

  function handleWorkspaceName(val: string) {
    setWorkspaceName(val)
    if (!slugTouched) setWorkspaceSlug(toSlug(val))
    setErrors(v => ({ ...v, workspaceName: undefined }))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())                              e.name          = 'Required'
    if (!email.includes('@'))                      e.email         = 'Enter a valid email'
    if (password.length < 8)                       e.password      = 'At least 8 characters'
    if (!workspaceName.trim())                     e.workspaceName = 'Required'
    if (!/^[a-z0-9-]{2,50}$/.test(workspaceSlug)) e.workspaceSlug = 'Lowercase letters and hyphens only'
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
        setErrors(v => ({ ...v, workspaceSlug: 'This URL is already taken — try another' }))
      } else {
        setApiError(err instanceof ApiError ? err.message : 'Something went wrong — try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout wide>
      <div className="px-8 pt-7 pb-6">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold text-ink-1 tracking-tight mb-1">Create your account</h1>
          <p className="text-[13.5px] text-ink-3">Set up Dyson for your engineering team</p>
        </div>

        {/* OAuth — side by side on wide card */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          <OAuthButton provider="google" />
          <OAuthButton provider="github" />
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-line" />
          <span className="text-[12px] text-ink-4 font-medium">or continue with email</span>
          <div className="flex-1 h-px bg-line" />
        </div>

        {/* API error */}
        {apiError && (
          <div className="mb-5 flex items-start gap-2.5 px-3.5 py-3 rounded-lg bg-red-50 border border-red-200">
            <div className="w-1.5 h-1.5 rounded-full bg-danger mt-1.5 flex-shrink-0" />
            <p className="text-[12.5px] text-danger leading-relaxed">{apiError}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-3.5">

            {/* Name + Email side by side */}
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Full name" placeholder="Alex Kumar" autoFocus
                value={name} error={errors.name}
                onChange={v => { setName(v); setErrors(e => ({ ...e, name: undefined })) }} />
              <InputField label="Work email" type="email" placeholder="alex@company.com"
                autoComplete="email" value={email} error={errors.email}
                onChange={v => { setEmail(v); setErrors(e => ({ ...e, email: undefined })) }} />
            </div>

            {/* Password */}
            <div>
              <InputField label="Password" type="password" placeholder="Minimum 8 characters"
                autoComplete="new-password" value={password} error={errors.password}
                onChange={v => { setPassword(v); setErrors(e => ({ ...e, password: undefined })) }} />
              <PasswordStrength password={password} />
            </div>

            {/* Workspace — side by side on wide card */}
            <div className="border-t border-line pt-3.5">
              <p className="text-[10.5px] font-semibold text-ink-4 uppercase tracking-[0.07em] mb-3">
                Workspace
              </p>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Workspace name" placeholder="Acme Engineering"
                  value={workspaceName} error={errors.workspaceName}
                  onChange={handleWorkspaceName} />
                <InputField label="URL" prefix="dyson.ai/"
                  placeholder="acme-eng" value={workspaceSlug} error={errors.workspaceSlug}
                  onChange={v => {
                    setSlugTouched(true)
                    setWorkspaceSlug(v.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    setErrors(e => ({ ...e, workspaceSlug: undefined }))
                  }} />
              </div>
            </div>

            {/* Submit */}
            <button type="submit" disabled={loading}
              className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-primary text-[13.5px] font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                : 'Create account'}
            </button>
          </div>
        </form>

        {/* Trust signals */}
        <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-line">
          {['Free to start', 'No credit card', '5-min setup'].map(t => (
            <div key={t} className="flex items-center gap-1.5">
              <Check className="w-3 h-3 text-success flex-shrink-0" />
              <span className="text-[11.5px] text-ink-3">{t}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Card footer */}
      <div className="px-8 py-4 border-t border-line bg-[#FAFAF8] text-center">
        <p className="text-[13px] text-ink-3">
          Already have an account?{' '}
          <Link to="/login" className="text-primary font-medium hover:text-primary-hover transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
