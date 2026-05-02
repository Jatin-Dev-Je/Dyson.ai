import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ArrowRight, Loader2, Check } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { authApi, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

function Field({ label, hint, error, children }: {
  label: string; hint?: string; error?: string | undefined; children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <label className="text-[12px] font-medium text-ink-2">{label}</label>
        {hint && <span className="text-[11px] text-ink-4">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-[11px] text-danger mt-1">{error}</p>}
    </div>
  )
}

function Input({ error, className = '', ...props }: React.InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      {...props}
      className={cn(
        'w-full h-9 px-3 rounded-md border text-[13px] text-ink-1 bg-surface placeholder:text-ink-4',
        'outline-none transition-all',
        error
          ? 'border-danger/50 focus:border-danger focus:ring-2 focus:ring-danger/10'
          : 'border-line hover:border-line-strong focus:border-primary/50 focus:ring-2 focus:ring-primary/10',
        className
      )}
    />
  )
}

function toSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const score = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password)].filter(Boolean).length
  const label = ['', 'Weak', 'Fair', 'Strong'][score] ?? ''
  const color = ['', 'bg-danger', 'bg-warning', 'bg-success'][score] ?? ''
  const textColor = ['', 'text-danger', 'text-warning', 'text-success'][score] ?? ''
  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn('flex-1 h-0.5 rounded-full transition-all', i < score ? color : 'bg-line')} />
        ))}
      </div>
      <p className={cn('text-[10px] font-medium', textColor)}>{label} password</p>
    </div>
  )
}

export default function Signup() {
  const navigate = useNavigate()
  const [name,           setName]           = useState('')
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [workspaceName,  setWorkspaceName]  = useState('')
  const [workspaceSlug,  setWorkspaceSlug]  = useState('')
  const [slugTouched,    setSlugTouched]    = useState(false)
  const [showPw,         setShowPw]         = useState(false)
  const [loading,        setLoading]        = useState(false)
  const [apiError,       setApiError]       = useState<string | null>(null)
  const [errors,         setErrors]         = useState<Record<string, string>>({})

  function handleWorkspaceName(val: string) {
    setWorkspaceName(val)
    if (!slugTouched) setWorkspaceSlug(toSlug(val))
  }

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim())                e.name          = 'Name is required'
    if (!email.includes('@'))        e.email         = 'Enter a valid email'
    if (password.length < 8)         e.password      = 'At least 8 characters'
    if (!workspaceName.trim())       e.workspaceName = 'Workspace name is required'
    if (!/^[a-z0-9-]{2,50}$/.test(workspaceSlug)) e.workspaceSlug = 'Lowercase letters, numbers, and hyphens'
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
        setErrors(v => ({ ...v, workspaceSlug: 'This URL is already taken' }))
      } else {
        setApiError(err instanceof ApiError ? err.message : 'Something went wrong — please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Set up Dyson for your engineering team.">
      {apiError && (
        <div className="mb-4 px-3 py-2.5 rounded-md bg-red-50 border border-red-200 text-[12.5px] text-danger">
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Field label="Full name" error={errors.name}>
          <Input type="text" placeholder="Alex Kumar" autoFocus
            value={name} error={!!errors.name}
            onChange={e => { setName(e.target.value); setErrors(v => ({ ...v, name: '' })) }} />
        </Field>

        <Field label="Work email" error={errors.email}>
          <Input type="email" placeholder="alex@company.com"
            value={email} error={!!errors.email}
            onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })) }} />
        </Field>

        <Field label="Password" error={errors.password}>
          <div className="relative">
            <Input type={showPw ? 'text' : 'password'} placeholder="Minimum 8 characters"
              value={password} error={!!errors.password} className="pr-9"
              onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })) }} />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-4 hover:text-ink-2 transition-colors">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrength password={password} />
        </Field>

        <div className="border-t border-line pt-4">
          <p className="text-[11.5px] text-ink-3 mb-3">Workspace details</p>
          <div className="space-y-3">
            <Field label="Workspace name" error={errors.workspaceName}>
              <Input type="text" placeholder="Acme Engineering"
                value={workspaceName} error={!!errors.workspaceName}
                onChange={e => { handleWorkspaceName(e.target.value); setErrors(v => ({ ...v, workspaceName: '' })) }} />
            </Field>

            <Field label="Workspace URL" error={errors.workspaceSlug}>
              <div className="flex items-center gap-1">
                <span className="text-[12px] text-ink-3 flex-shrink-0">dyson.ai/</span>
                <Input type="text" placeholder="acme-eng" className="flex-1"
                  value={workspaceSlug} error={!!errors.workspaceSlug}
                  onChange={e => {
                    setSlugTouched(true)
                    setWorkspaceSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                    setErrors(v => ({ ...v, workspaceSlug: '' }))
                  }} />
              </div>
            </Field>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full h-9 flex items-center justify-center gap-2 rounded-md bg-primary text-[13px] font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" />Creating account…</>
            : <><span>Create account</span><ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>

      <div className="mt-5 pt-4 border-t border-line space-y-1.5">
        {['Free for up to 5 users', 'Slack + GitHub connected in minutes', 'No credit card required'].map(p => (
          <div key={p} className="flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-success flex-shrink-0" />
            <span className="text-[12px] text-ink-3">{p}</span>
          </div>
        ))}
      </div>

      <p className="text-[12.5px] text-ink-3 mt-5 text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-primary hover:text-primary-hover font-medium transition-colors">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
