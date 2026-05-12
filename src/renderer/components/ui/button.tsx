import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/cn'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 px-4 py-2'
    const variants = {
      default: 'bg-neutral-100 text-neutral-900 hover:bg-neutral-200',
      ghost: 'hover:bg-neutral-800 text-neutral-100'
    } as const
    return <button ref={ref} className={cn(base, variants[variant], className)} {...props} />
  }
)
Button.displayName = 'Button'
