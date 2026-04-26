import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Github, ArrowRight } from 'lucide-react'
import { AuthLayout } from './AuthLayout'
import { auth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export default function Login() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = (location.state as { from?: string } | null)?.from ?? '/app'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [errors,   setErrors]   = useState<{ email: string; password: string }>({ email: '', password: '' })

  function validate() {
    const emailErr    = !email.includes('@') ? 'Enter a valid email address' : ''
    const passwordErr = password.length < 1  ? 'Password is required'       : ''
    setErrors({ email: emailErr, password: passwordErr })
    return !emailErr && !passwordErr
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    auth.login(email)
    navigate(from, { replace: true })
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to your Dyson workspace."
    >
      {/* GitHub OAuth */}
      <button
        type="button"
        className="w-full flex items-center justify-center gap-2.5 py-2.5 rounded-xl border border-white/[0.10] bg-white/[0.04] text-[13.5px] font-medium text-white/80 hover:bg-white/[0.07] hover:border-white/[0.15] hover:text-white active:scale-[0.99] transition-all duration-150 mb-5"
      >
        <Github className="w-4 h-4" />
        Continue with GitHub
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-[11px] text-white/25 font-mono">or with email</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-3.5">

        {/* Email */}
        <div>
          <label className="block text-[12px] font-medium text-white/50 mb-1.5">
            Email address
          </label>
          <input
            type="email"
            autoComplete="email"
            autoFocus
            placeholder="alex@company.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setErrors(v => ({ ...v, email: '' })) }}
            className={cn(
              'w-full h-10 px-3.5 rounded-xl border bg-white/[0.03] text-[13.5px] text-white placeholder:text-white/20',
              'outline-none transition-all duration-150',
              'focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/25',
              errors.email
                ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/15'
                : 'border-white/[0.08] focus:border-primary/50'
            )}
          />
          {errors.email && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-400 mt-1.5">{errors.email}</motion.p>
          )}
        </div>

        {/* Password */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-[12px] font-medium text-white/50">Password</label>
            <Link
              to="/forgot-password"
              className="text-[11.5px] text-white/30 hover:text-white/60 transition-colors"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Your password"
              value={password}
              onChange={e => { setPassword(e.target.value); setErrors(v => ({ ...v, password: '' })) }}
              className={cn(
                'w-full h-10 px-3.5 pr-10 rounded-xl border bg-white/[0.03] text-[13.5px] text-white placeholder:text-white/20',
                'outline-none transition-all duration-150',
                'focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/25',
                errors.password
                  ? 'border-red-500/50 focus:border-red-500/50 focus:ring-red-500/15'
                  : 'border-white/[0.08] focus:border-primary/50'
              )}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/50 transition-colors"
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-[11px] text-red-400 mt-1.5">{errors.password}</motion.p>
          )}
        </div>

        {/* Remember me */}
        <div className="flex items-center gap-2.5 pt-0.5">
          <button
            type="button"
            onClick={() => setRemember(v => !v)}
            className={cn(
              'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all duration-150',
              remember
                ? 'bg-primary border-primary'
                : 'border-white/[0.15] bg-white/[0.03] hover:border-primary/50'
            )}
          >
            {remember && (
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
          <span className="text-[12px] text-white/35">Remember me for 30 days</span>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-xl bg-primary text-[13.5px] font-medium text-white hover:bg-primary/90 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 shadow-[0_0_24px_rgba(99,102,241,0.3)] mt-1"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Signing in…
            </>
          ) : (
            <>
              Sign in
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Sign up link */}
      <p className="text-[12.5px] text-white/30 mt-7 text-center">
        Don't have an account?{' '}
        <Link to="/signup" className="text-white/60 hover:text-white underline underline-offset-2 transition-colors">
          Create one free
        </Link>
      </p>
    </AuthLayout>
  )
}
