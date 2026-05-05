import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Loader2, CheckCircle } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { apiFetch, ApiError } from '@/lib/api'

export default function ForgotPassword() {
  const [email,   setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent,    setSent]    = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.includes('@')) { setError('Enter a valid email address'); return }
    setLoading(true)
    setError(null)
    try {
      await apiFetch('/auth/forgot-password', {
        method:   'POST',
        body:     JSON.stringify({ email: email.toLowerCase().trim() }),
        skipAuth: true,
      })
      setSent(true)
    } catch (err) {
      // Always show success to prevent email enumeration — only show server errors
      if (err instanceof ApiError && err.status >= 500) {
        setError('Something went wrong — please try again.')
      } else {
        setSent(true) // treat 4xx as success too (no enumeration)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="px-8 pt-8 pb-7">
        {sent ? (
          <div className="text-center py-4">
            <CheckCircle className="w-10 h-10 text-success mx-auto mb-4" />
            <h2 className="text-[20px] font-semibold text-[#1a1a1a] mb-2">Check your email</h2>
            <p className="text-[13.5px] text-[#6b6b6b] mb-6 leading-relaxed">
              If <span className="font-medium text-[#1a1a1a]">{email}</span> has a Dyson account,
              we've sent a password reset link. Check your inbox.
            </p>
            <p className="text-[12.5px] text-[#9b9b9b]">
              Didn't get it? Check your spam folder or{' '}
              <button onClick={() => setSent(false)} className="text-primary hover:text-primary-hover transition-colors font-medium">
                try again
              </button>
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-[22px] font-semibold text-[#1a1a1a] tracking-tight mb-1">Reset your password</h1>
              <p className="text-[13.5px] text-[#6b6b6b]">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            {error && (
              <div className="mb-4 px-3.5 py-3 rounded-lg bg-red-50 border border-red-200 text-[12.5px] text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#6b6b6b] mb-1.5">Email address</label>
                <input
                  type="email" autoComplete="email" autoFocus
                  placeholder="you@company.com"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(null) }}
                  className="w-full h-10 px-3.5 rounded-lg border border-[#E8E7E5] bg-white text-[13.5px] text-[#1a1a1a] placeholder:text-[#c0c0c0] outline-none hover:border-[#D4D3CF] focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>

              <button type="submit" disabled={loading}
                className="w-full h-10 flex items-center justify-center gap-2 rounded-lg bg-primary text-[13.5px] font-medium text-white hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending…</>
                  : 'Send reset link'}
              </button>
            </form>
          </>
        )}
      </div>

      <div className="px-8 py-4 border-t border-[#F0EFED] bg-[#FAFAF8] flex items-center justify-center">
        <Link to="/login" className="flex items-center gap-1.5 text-[13px] text-[#9b9b9b] hover:text-primary transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  )
}
