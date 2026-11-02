const STAT_MAX = 180 // above this a bar is simply full; most base stats are far below

export function StatBar({ label, value }: { label: string, value: number }) {
  const percent = Math.min(100, (value / STAT_MAX) * 100)
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 shrink-0 text-muted">{label}</span>
      <span className="w-7 shrink-0 text-right font-semibold tabular-nums">{value}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent" style={{ width: `${percent}%` }} />
      </div>
    </div>
  )
}
