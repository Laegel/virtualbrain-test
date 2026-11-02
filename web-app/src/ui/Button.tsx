import type { ButtonHTMLAttributes } from 'react'
import { cx } from './cx'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-fg hover:bg-accent/90',
  secondary: 'bg-surface-2 text-fg border border-border hover:bg-border/60',
  ghost: 'text-muted hover:text-fg hover:bg-surface-2',
}

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className, type = 'button', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant], sizes[size], className,
      )}
      {...props}
    />
  )
}
