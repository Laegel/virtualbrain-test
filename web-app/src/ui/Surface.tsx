import type { HTMLAttributes } from 'react'
import { cx } from './cx'

export function Surface({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-card border border-border bg-surface', className)} {...props} />
}
