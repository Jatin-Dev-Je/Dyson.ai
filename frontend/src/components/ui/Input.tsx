import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string; error?: string; icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({ className, label, error, icon, ...props }, ref) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label className="text-[12px] font-medium text-text-3">{label}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-4">{icon}</div>}
      <input
        ref={ref}
        className={cn(
          'w-full h-8 rounded-md border border-[#2E2E2E] bg-white/[0.03] px-3 text-[13px] text-text-1 placeholder:text-text-4',
          'transition-all duration-150',
          'outline-none focus:border-primary/50 focus:bg-white/[0.05] focus:ring-2 focus:ring-primary/10',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          icon && 'pl-9',
          error && 'border-red-500/40 focus:border-red-500/50 focus:ring-red-500/10',
          className
        )}
        {...props}
      />
    </div>
    {error && <p className="text-[11px] text-red-400">{error}</p>}
  </div>
))
Input.displayName = 'Input'
