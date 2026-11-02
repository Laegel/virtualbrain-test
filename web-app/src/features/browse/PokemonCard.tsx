import { memo, useRef, type PointerEvent } from 'react'
import { asPokemonType } from '../../types/pokemon'
import { TypeBadge, cx, formatName } from '../../ui'
import type { PokemonSummary } from '../../types/pokemon'

const STATS = [['HP', 'HP'], ['attack', 'ATK'], ['defense', 'DEF'], ['speed', 'SPD']] as const

interface PokemonCardProps {
  pokemon: PokemonSummary
  selected: boolean
  /** 1 or 2 when this pokemon is the first or second pick */
  slot?: number
  onToggle: (id: number) => void
}

const prefersReducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * Foil-framed trading card. Tilts towards the pointer, with a glare that follows it.
 * Memoised: with 898 cards, toggling one selection must not re-render the others.
 */
export const PokemonCard = memo(function PokemonCard({ pokemon, selected, slot, onToggle }: PokemonCardProps) {
  const { id, name, image, types, stats } = pokemon
  const [first, second] = [asPokemonType(types[0]), asPokemonType(types[1] ?? types[0])]
  const ref = useRef<HTMLButtonElement>(null)

  // Written straight to CSS variables: no React re-render on every pointer move
  const tilt = (event: PointerEvent<HTMLButtonElement>) => {
    const el = ref.current
    if (!el || event.pointerType !== 'mouse' || prefersReducedMotion()) return
    const box = el.getBoundingClientRect()
    const x = (event.clientX - box.left) / box.width
    const y = (event.clientY - box.top) / box.height
    el.style.setProperty('--rx', `${((0.5 - y) * 12).toFixed(1)}deg`)
    el.style.setProperty('--ry', `${((x - 0.5) * 14).toFixed(1)}deg`)
    el.style.setProperty('--gx', `${(x * 100).toFixed(0)}%`)
    el.style.setProperty('--gy', `${(y * 100).toFixed(0)}%`)
  }
  const rest = () => ['--rx', '--ry', '--gx', '--gy'].forEach((v) => ref.current?.style.removeProperty(v))

  return (
    <button
      ref={ref}
      type="button"
      aria-pressed={selected}
      onClick={() => onToggle(id)}
      onPointerMove={tilt}
      onPointerLeave={rest}
      style={{ background: `linear-gradient(135deg, rgb(var(--type-${first})), rgb(var(--type-${second})))` }}
      className={cx(
        'group relative h-full w-full rounded-card p-[3px] text-left shadow-sm transition-[transform,box-shadow] duration-150 ease-out',
        '[transform:perspective(700px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))]',
        // 255 = real card height (260.5) minus the 3px frame on each side: the size applies to the content box
        '[content-visibility:auto] [contain-intrinsic-size:auto_255px]',
        'hover:shadow-xl',
        selected && 'ring-4 ring-accent ring-offset-2 ring-offset-bg',
      )}
    >
      <div className="relative flex flex-col overflow-hidden rounded-[0.7rem] bg-surface">
        <div
          className="relative px-3 pt-2"
          style={{ background: `radial-gradient(80% 90% at 50% 70%, rgb(var(--type-${first}) / 0.30), transparent 75%)` }}
        >
          {/* Fixed height: the Fighter chip is taller than the #id it replaces and must not make the card grow */}
          <div className="flex h-5 items-center justify-between text-xs">
            <span className="font-semibold">{formatName(name)}</span>
            {slot
              ? <span className="animate-pop-in rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold leading-none text-accent-fg">Fighter {slot}</span>
              : <span className="tabular-nums text-muted">#{String(id).padStart(3, '0')}</span>}
          </div>
          <img src={image} alt="" width={475} height={475} loading="lazy" className="mx-auto aspect-square w-full max-w-[150px] object-contain drop-shadow-md" />
        </div>
        <div className="flex flex-col gap-2 p-3 pt-1">
          <div className="flex justify-center gap-1">{types.map((t) => <TypeBadge key={t} type={asPokemonType(t)} />)}</div>
          <div className="grid grid-cols-4 gap-1 text-center">
            {STATS.map(([key, label]) => (
              <div key={key} className="rounded-md bg-surface-2 py-1">
                <div className="text-[10px] font-semibold text-muted">{label}</div>
                <div className="text-sm font-bold tabular-nums">{stats[key]}</div>
              </div>
            ))}
          </div>
        </div>
        {/* glare */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 mix-blend-soft-light transition-opacity group-hover:opacity-100"
          style={{ background: 'radial-gradient(circle at var(--gx, 50%) var(--gy, 30%), rgb(255 255 255 / 0.85), transparent 55%)' }}
        />
      </div>
    </button>
  )
})
