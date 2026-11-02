import { cx } from './cx'

/** Health bar: turns red under a quarter. The width change is animated so hits are visible. */
export function HpBar({ current, max, label }: { current: number, max: number, label: string }) {
  const percent = Math.max(0, Math.min(100, (current / max) * 100))
  return (
    <div className="w-full">
      <div
        role="progressbar" aria-label={`${label} HP`} aria-valuemin={0} aria-valuemax={max} aria-valuenow={current}
        className="h-2.5 overflow-hidden rounded-full bg-surface-2"
      >
        <div
          className={cx('h-full rounded-full transition-[width] duration-700', percent <= 25 ? 'bg-danger' : 'bg-accent')}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-1 text-right text-xs tabular-nums text-muted">{current} / {max}</div>
    </div>
  )
}
