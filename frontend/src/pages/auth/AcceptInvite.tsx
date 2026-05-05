import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { authApi, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import { DysonMark } from '@/components/shared/DysonMark'

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null
  const score  = [password.length >= 8, /[A-Z]/.test(password), /[0-9!@#$%]/.test(password)].filter(Boolean).length
  const bars   = ['bg-danger', 'bg-warning', 'bg-success']
  const labels = ['Weak', 'Fair', 'Strong']
  const colors = ['text-danger', 'text-warning', 'text-success']
  return (
    <div className="mt-2">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2].map(i => (
          <div key={i} className={cn('flex-1 h-0.5 rounded-full transition-all', i < score ? bars[score - 1] : 'bg-[#E8E7E5]')} />
        ))}
      </div>
      <p className={cn('text-[11px] font-medium', colors[score - 1] ?? 'text-[#9b9b9b]')}>
        {labels[score - 1] ?? 'Too short'}
      </p>
    </div>
  )
}

type InviteInfo = { email: string; role: string; tenantId: string }

export default function AcceptInvite() {
  const navigate  = useNavigate()
  const [params]  = useSearchParams()
  const token     = params.get('token') ?? ''

  const [info,     setInfo]     = useState<InviteInfo | null>(null)
  const [infoErr,  setInfoErr]  = useState<string | null>(null)
  const [name,     setName]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [done,     setDone]     = useState(false)
  const [error,    setError]    = useState<string | null>(null)

  // Validate the invite token on mount
  useEffect(() => {
    if (!token) { setInfoErr('Invitation link is missing or invalid.'); return }
    authApi.getInviteInfo(token)
      .then(setInfo)
      .catch(() => setInfoErr('This invitation link is invalid or has expired.'))
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim())         { setError('Name is required'); return }
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }

    setLoading(true)
    setError(null)
    try {
      await authApi.acceptInvite({ token, name: name.trim(), password })
      setDone(true)
      setTimeout(() => navigate('/app', { replace: true }), 1500)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.code === 'INVITE_EXPIRED'
            ? 'This invitation has expired. Ask your admin to send a new one.'
            : err.code === 'INVITE_USED'
            ? 'This invitation has already been used. Try signing in instead.'
            : err.message
          : 'Something went wrong — please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  // Token missing or invalid
  if (infoErr) {
    return (
      <AuthLayout>
        <div className="px-8 py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
            <span className="text-danger text-lg">!</span>
          </div>
          <h2 className="text-[18px] font-semibold text-[#1a1a1a] mb-2">Invalid invitation</h2>
          <p className="text-[13.5px] text-[#6b6b6b]">{infoErr}</p>
        </div>
      </AuthLayout>
    )
  }

  // Loading invite info
  if (!info) {
    return (
      <AuthLayout>
        <div className="px-8 py-12 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-[#9b9b9b] animate-spin" />
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <div className="px-8 pt-8 pb-7">
        {done ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-success mx-auto mb-4" />
            <h2 className="text-[20px] font-semibold text-[#1a1a1a] mb-2">Welcome to Dyson!</h2>
            <p className="text-[13.5px] text-[#6b6b6b]">Setting up your workspace…</p>
          </div>
        ) : (
          <>
            {/* Invite header */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#F0EFED]">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
                <DysonMark size={18} className="text-white" />
              </div>
              <div>
                <p className="text-[13px] text-[#9b9b9b]">You've been invited to join</p>
                <p className="text-[15px] font-semibold text-[#1a1a1a]">Dyson</p>
              </div>
            </div>

            <div className="mb-6">
              <h1 className="text-[22px] font-semibold text-[#1a1a1a] tracking-tight mb-1">Create your account</h1>
              <p className="text-[13.5px] text-[#6b6b6b]">
                Joining as <span className="font-medium text-[#1a1a1a]">{info.email}</span>
                {' '}with <span className="font-medium text-[#1a1a1a]">{info.role}</span> access.
              </p>
            </div>

            {error && (
              <div className="mb-4 px-3.5 py-3 rounded-lg bg-red-50 border border-red-200 text-[12.5px] text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              {/* Email — read only */}
              <div>
                <label className="block text-[12px] font-medium text-[#6b6b6b] mb-1.5">Email</label>
                <input
                  type="email" readOnly value={info.email}
                  className="w-full h-10 px-3.5 rounded-lg border border-[#E8E7E5] bg-[#FAFAF8] text-[13.5px] text-[#9b9b9b] cursor-default outline-none"
                />
              </div>

              {/* Full name */}
              <div>
                <label className="block text-[12px] font-medium text-[#6b6b6b] mb-1.5">Full name</label>
                <input
                  type="text" autoFocus autoComplete="name"
                  placeholder="Alex Kumar"
                  value={name}
                  onChange={e => { setName(e.target.value); setError(null) }}
                  className="w-full h-10 px-3.5 rounded-lg border border-[#E8E7E5] bg-white text-[13.5px] text-[#1a1a1a] placeholder:text-[#c0c0c0] outline-none hover:border-[#D4D3CF] focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[12px] font-medium text-[#6b6b6b] mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={e => { setPassword(e.target.value); setError(null) }}
                    className="w-full h-10 px-3.5 pr-11 rounded-lg border border-[#E8E7E5] bg-white text-[13.5px] text-[#1a1a1a] placeholder:text-[#c0c0c0] outline-none hover:border-[#D4D3CF] focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9b9b9b] hover:text-[#6b6b6b] transition-colors">
                    {showPw ? <EyeOff className="w-[17px] h-[17px]" /> : <Eye className="w-[17px] h-[17px]" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              <button type="submit" disabled={loading}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-primary text-[13.5px] font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account…</>
                  : 'Join workspace'}
              </button>
            </form>
          </>
        )}
      </div>
    </AuthLayout>
  )
}
