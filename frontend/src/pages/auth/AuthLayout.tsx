import { Link } from 'react-router-dom'
import { DysonMark } from '@/components/shared/DysonMark'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#F5F5F0] flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-[400px]">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-sm group-hover:opacity-90 transition-opacity">
              <DysonMark size={18} className="text-white" />
            </div>
            <span className="text-[18px] font-semibold text-ink-1 tracking-tight">Dyson</span>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-line shadow-[0_2px_16px_rgba(0,0,0,0.07)] overflow-hidden">
          {children}
        </div>

        {/* Footer */}
        <p className="text-center text-[11.5px] text-ink-4 mt-6">
          By continuing, you agree to our{' '}
          <a href="#" className="underline underline-offset-2 hover:text-ink-2 transition-colors">Terms</a>
          {' '}and{' '}
          <a href="#" className="underline underline-offset-2 hover:text-ink-2 transition-colors">Privacy Policy</a>
        </p>
      </div>
    </div>
  )
}
