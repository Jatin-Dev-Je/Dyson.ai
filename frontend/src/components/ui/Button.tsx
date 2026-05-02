import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-[#141414] disabled:pointer-events-none disabled:opacity-40 select-none whitespace-nowrap',
  {
    variants: {
      variant: {
        primary:   'bg-primary text-white hover:bg-primary-hover active:scale-[0.98] shadow-primary',
        secondary: 'bg-subtle border border-line text-ink-2 hover:bg-hover hover:border-line-strong hover:text-ink-1',
        ghost:     'text-ink-3 hover:text-ink-2 hover:bg-hover',
        danger:    'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/15',
        citation:  'bg-citation-dim text-citation border border-citation/20 hover:bg-citation/15',
      },
      size: {
        sm:   'h-7 px-2.5 text-xs rounded',
        md:   'h-8 px-3 text-[13px] rounded-md',
        lg:   'h-9 px-4 text-[13px] rounded-md',
        xl:   'h-11 px-5 text-[14px] rounded-lg',
        icon: 'h-7 w-7 rounded-md',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
)

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { loading?: boolean }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, children, disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  )
)
Button.displayName = 'Button'

