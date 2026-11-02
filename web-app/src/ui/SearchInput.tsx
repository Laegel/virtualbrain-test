import type { InputHTMLAttributes } from 'react'
import { FiSearch } from 'react-icons/fi'
import { cx } from './cx'

export function SearchInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <label className={cx('relative block', className)}>
      <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
      <input
        type="search"
        className="h-10 w-full rounded-lg border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-muted"
        {...props}
      />
    </label>
  )
}
