import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { authApi, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

type Field = { value: string; error: string; touched: boolean }
function field(value = ''): Field { return { value, error: '', touched: false } }

const perks = [
  'Free for 5 users, no credit card',
  'Slack + GitHub connected in 3 minutes',
  'First WHY answer in under an hour',
]

function PasswordStrength({ password }: { password: string }) {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password)]
  const score  = checks.filter(Boolean).length
  const label  = ['', 'Weak', 'Good', 'Strong'][score] ?? ''
  const color  = ['', 'bg-red-500', 'bg-yellow-500', 'bg-green-500'][score] ?? ''
  if (!password) return null
  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn('flex-1 h-0.5 rounded-full transition-all duration-300', i < score ? color : 'bg-white/10')} />
        ))}
      </div>
      <p className={cn('text-[10px] font-mono', score === 1 ? 'text-red-400' : score === 2 ? 'text-yellow-400' : 'text-green-400')}>
        {label} password
      </p>
    </motion.div>
  )
}

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50)
}

export default function Signup() {
  const navigate = useNavigate()
  const [name,          setName]          = useState(field())
  const [email,         setEmail]         = useState(field())
  const [password,      setPassword]      = useState(field())
  const [workspaceName, setWorkspaceName] = useState(field())
  const [workspaceSlug, setWorkspaceSlug] = useState(field())
  const [showPw,        setShowPw]        = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [agreed,        setAgreed]        = useState(false)
  const [apiError,      setApiError]      = useState<string | null>(null)

  function handleWorkspaceName(value: string) {
    setWorkspaceName({ value, error: '', touched: true })
    // Auto-fill slug only if user hasn't manually edited it
    if (!workspaceSlug.touched) {
      setWorkspaceSlug({ value: toSlug(value), error: '', touched: false })
    }
  }

  function validate() {
    let ok = true
    if (!name.value.trim()) {
      setName(v => ({ ...v, error: 'Name is required', touched: true })); ok = false
    }
    if (!email.value.includes('@')) {
      setEmail(v => ({ ...v, error: 'Enter a valid work email', touched: true })); ok = false
    }
    if (password.value.length < 8) {
      setPassword(v => ({ ...v, error: 'At least 8 characters', touched: true })); ok = false
    }
    if (!workspaceName.value.trim()) {
      setWorkspaceName(v => ({ ...v, error: 'Workspace name is required', touched: true })); ok = false
    }
    const slug = workspaceSlug.value
    if (!slug || !/^[a-z0-9-]{2,50}$/.test(slug)) {
      setWorkspaceSlug(v => ({ ...v, error: 'Lowercase letters, numbers, and hyphens only', touched: true })); ok = false
    }
    if (!agreed) ok = false
    return ok
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    setApiError(null)
    try {
      await authApi.signup({
        name:          name.value.trim(),
        email:         email.value.trim(),
        password:      password.value,
        workspaceName: workspaceName.value.trim(),
        workspaceSlug: workspaceSlug.value.trim(),
      })
      navigate('/app', { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'SLUG_TAKEN') {
          setWorkspaceSlug(v => ({ ...v, error: 'This workspace URL is already taken', touched: true }))
        } else {
          setApiError(err.message)
        }
      } else {
        setApiError('Something went wrong — please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Set up Dyson for your engineering team in minutes."
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

      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">

        {/* Name */}
        <div>
          <label className="block text-[12px] font-medium text-white/50 mb-1.5">Full name</label>
          <input
            type="text" autoComplete="name" placeholder="Alex Kumar"
            value={name.value}
            onChange={e => setName({ value: e.target.value, error: '', touched: true })}
            className={cn(
              'w-full h-10 px-3.5 rounded-xl border bg-white/[0.03] text-[13.5px] text-white placeholder:text-white/20',
              'outline-none transition-all duration-150 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/25',
              name.error && name.touched ? 'border-red-500/50' : 'border-white/[0.08] focus:border-primary/50'
            )}
          />
          {name.error && name.touched && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-400 mt-1.5">{name.error}</motion.p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-[12px] font-medium text-white/50 mb-1.5">Work email</label>
          <input
            type="email" autoComplete="email" placeholder="alex@company.com"
            value={email.value}
            onChange={e => setEmail({ value: e.target.value, error: '', touched: true })}
            className={cn(
              'w-full h-10 px-3.5 rounded-xl border bg-white/[0.03] text-[13.5px] text-white placeholder:text-white/20',
              'outline-none transition-all duration-150 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/25',
              email.error && email.touched ? 'border-red-500/50' : 'border-white/[0.08] focus:border-primary/50'
            )}
          />
          {email.error && email.touched && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-400 mt-1.5">{email.error}</motion.p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-[12px] font-medium text-white/50 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'} autoComplete="new-password" placeholder="Minimum 8 characters"
              value={password.value}
              onChange={e => setPassword({ value: e.target.value, error: '', touched: true })}
              className={cn(
                'w-full h-10 px-3.5 pr-10 rounded-xl border bg-white/[0.03] text-[13.5px] text-white placeholder:text-white/20',
                'outline-none transition-all duration-150 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/25',
                password.error && password.touched ? 'border-red-500/50' : 'border-white/[0.08] focus:border-primary/50'
              )}
            />
            <button type="button" onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors">
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <PasswordStrength password={password.value} />
          {password.error && password.touched && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-400 mt-1.5">{password.error}</motion.p>
          )}
        </div>

        {/* Workspace name */}
        <div>
          <label className="block text-[12px] font-medium text-white/50 mb-1.5">Workspace name</label>
          <input
            type="text" placeholder="Acme Engineering"
            value={workspaceName.value}
            onChange={e => handleWorkspaceName(e.target.value)}
            className={cn(
              'w-full h-10 px-3.5 rounded-xl border bg-white/[0.03] text-[13.5px] text-white placeholder:text-white/20',
              'outline-none transition-all duration-150 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/25',
              workspaceName.error && workspaceName.touched ? 'border-red-500/50' : 'border-white/[0.08] focus:border-primary/50'
            )}
          />
          {workspaceName.error && workspaceName.touched && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-400 mt-1.5">{workspaceName.error}</motion.p>
          )}
        </div>

        {/* Workspace slug */}
        <div>
          <label className="block text-[12px] font-medium text-white/50 mb-1.5">Workspace URL</label>
          <div className="flex items-center gap-2">
            <span className="text-[12px] text-white/30 flex-shrink-0">dyson.app/</span>
            <input
              type="text" placeholder="acme-engineering"
              value={workspaceSlug.value}
              onChange={e => setWorkspaceSlug({ value: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''), error: '', touched: true })}
              className={cn(
                'flex-1 h-10 px-3.5 rounded-xl border bg-white/[0.03] text-[13.5px] text-white placeholder:text-white/20',
                'outline-none transition-all duration-150 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/25',
                workspaceSlug.error && workspaceSlug.touched ? 'border-red-500/50' : 'border-white/[0.08] focus:border-primary/50'
              )}
            />
          </div>
          {workspaceSlug.error && workspaceSlug.touched && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-400 mt-1.5">{workspaceSlug.error}</motion.p>
          )}
        </div>

        {/* Terms */}
        <div className="flex items-start gap-2.5 pt-1">
          <button type="button" onClick={() => setAgreed(v => !v)}
            className={cn(
              'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-150',
              agreed ? 'bg-primary border-primary' : 'border-white/[0.15] bg-white/[0.03] hover:border-primary/50'
            )}>
            {agreed && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
          </button>
          <p className="text-[12px] text-white/35 leading-[1.5]">
            I agree to the{' '}
            <a href="#" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Terms of Service</a>
            {' '}and{' '}
            <a href="#" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">Privacy Policy</a>
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !agreed}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-[13.5px] font-medium text-white hover:bg-primary/90 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 shadow-[0_0_24px_rgba(99,102,241,0.3)] mt-1"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Creating account…
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Perks */}
      <div className="mt-6 space-y-2">
        {perks.map(p => (
          <div key={p} className="flex items-center gap-2">
            <Check className="w-3 h-3 text-primary/70 flex-shrink-0" />
            <span className="text-[11.5px] text-white/30">{p}</span>
          </div>
        ))}
      </div>

      <p className="text-[12.5px] text-white/30 mt-7 text-center">
        Already have an account?{' '}
        <Link to="/login" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">
          Log in
        </Link>
      </p>
    </AuthLayout>
  )
}
