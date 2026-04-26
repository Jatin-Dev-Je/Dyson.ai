import { cn } from '@/lib/utils'
import { cva, type VariantProps } from 'class-variance-authority'

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-mono text-[11px] rounded-full px-2 py-0.5 border',
  {
    variants: {
      variant: {
        default:  'bg-white/[0.04] text-text-3 border-[#2E2E2E]',
        primary:  'bg-primary/10 text-primary border-primary/20',
        citation: 'bg-citation/10 text-citation border-citation/20',
        success:  'bg-green-500/10 text-green-400 border-green-500/20',
        warning:  'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        danger:   'bg-red-500/10 text-red-400 border-red-500/20',
        slack:    'bg-[#4A154B]/20 text-[#E01E5A] border-[#4A154B]/30',
        github:   'bg-white/[0.04] text-[#8B949E] border-[#2E2E2E]',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
