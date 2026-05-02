import { Link } from 'react-router-dom'
import { DysonMark } from '@/components/shared/DysonMark'

export function AuthLayout({ children, title, subtitle }: {
  children: React.ReactNode; title: string; subtitle: string
}) {
  return (
    <div className="min-h-screen bg-subtle flex flex-col">
      {/* Topbar */}
      <header className="flex items-center justify-between px-8 h-14 border-b border-line bg-surface">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <DysonMark size={18} className="text-primary" />
          <span className="text-[14px] font-semibold text-ink-1">Dyson</span>
        </Link>
        <span className="text-[12px] text-ink-3 hidden sm:block">Company Memory</span>
      </header>

      {/* Form area */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">
          {/* Card */}
          <div className="bg-surface border border-line rounded-xl shadow-sm p-8">
            <div className="mb-7">
              <h1 className="text-[22px] font-semibold text-ink-1 tracking-tight mb-1.5">{title}</h1>
              <p className="text-[13px] text-ink-3">{subtitle}</p>
            </div>
            {children}
          </div>

          {/* Footer */}
          <p className="text-center text-[11px] text-ink-4 mt-6">
            By continuing, you agree to our{' '}
            <a href="#" className="text-ink-3 hover:text-ink-2 underline underline-offset-2">Terms</a>
            {' '}and{' '}
            <a href="#" className="text-ink-3 hover:text-ink-2 underline underline-offset-2">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  )
}
