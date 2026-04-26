import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

type CardProps = React.HTMLAttributes<HTMLDivElement> & { hover?: boolean; active?: boolean }

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, hover, active, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-[#2E2E2E] bg-[#1C1C1C]',
      hover && 'transition-all duration-150 hover:border-[#3D3D3D] hover:bg-[#212121] cursor-pointer',
      active && 'border-primary/30 bg-primary/[0.06]',
      className
    )}
    {...props}
  />
))
Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-5 py-3.5 border-b border-[#2E2E2E]', className)} {...props} />
))
CardHeader.displayName = 'CardHeader'

export const CardContent = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-5 py-4', className)} {...props} />
))
CardContent.displayName = 'CardContent'

export const CardFooter = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('px-5 py-3.5 border-t border-[#2E2E2E]', className)} {...props} />
))
CardFooter.displayName = 'CardFooter'
