import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { apiFetch, ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'

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

export default function ResetPassword() {
  const navigate        = useNavigate()
  const [params]        = useSearchParams()
  const token           = params.get('token') ?? ''

  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [showPw,    setShowPw]    = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [done,      setDone]      = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  if (!token) {
    return (
      <AuthLayout>
        <div className="px-8 py-10 text-center">
          <p className="text-[14px] text-[#6b6b6b] mb-4">This reset link is invalid or has expired.</p>
          <Link to="/forgot-password" className="text-primary font-medium hover:text-primary-hover transition-colors text-[13.5px]">
            Request a new link →
          </Link>
        </div>
      </AuthLayout>
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8)    { setError('Password must be at least 8 characters'); return }
    if (password !== confirm)    { setError('Passwords do not match'); return }

    setLoading(true)
    try {
      await apiFetch('/auth/reset-password', {
        method:   'POST',
        body:     JSON.stringify({ token, newPassword: password }),
        skipAuth: true,
      })
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(
        err instanceof ApiError && err.code === 'INVALID_TOKEN'
          ? 'This reset link is invalid or has expired. Please request a new one.'
          : err instanceof ApiError ? err.message : 'Something went wrong — please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="px-8 pt-8 pb-7">
        {done ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-success mx-auto mb-4" />
            <h2 className="text-[20px] font-semibold text-[#1a1a1a] mb-2">Password updated</h2>
            <p className="text-[13.5px] text-[#6b6b6b]">
              Your password has been changed. Redirecting you to sign in…
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-[22px] font-semibold text-[#1a1a1a] tracking-tight mb-1">Set new password</h1>
              <p className="text-[13.5px] text-[#6b6b6b]">Choose a strong password for your account.</p>
            </div>

            {error && (
              <div className="mb-4 px-3.5 py-3 rounded-lg bg-red-50 border border-red-200 text-[12.5px] text-red-600">
                {error}
                {error.includes('expired') && (
                  <> {' '}<Link to="/forgot-password" className="underline font-medium">Request a new link</Link></>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#6b6b6b] mb-1.5">New password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password" autoFocus
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

              <div>
                <label className="block text-[12px] font-medium text-[#6b6b6b] mb-1.5">Confirm password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Repeat new password"
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); setError(null) }}
                  className={cn(
                    'w-full h-10 px-3.5 rounded-lg border bg-white text-[13.5px] text-[#1a1a1a] placeholder:text-[#c0c0c0] outline-none transition-all',
                    confirm && confirm !== password
                      ? 'border-danger/50 focus:border-danger focus:ring-2 focus:ring-danger/10'
                      : 'border-[#E8E7E5] hover:border-[#D4D3CF] focus:border-primary/60 focus:ring-2 focus:ring-primary/10'
                  )}
                />
                {confirm && confirm !== password && (
                  <p className="text-[11.5px] text-danger mt-1">Passwords don't match</p>
                )}
              </div>

              <button type="submit" disabled={loading || password !== confirm}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-primary text-[13.5px] font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating password…</>
                  : 'Update password'}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="px-8 py-4 border-t border-[#F0EFED] bg-[#FAFAF8] text-center">
        <Link to="/login" className="text-[13px] text-[#9b9b9b] hover:text-primary transition-colors">
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
