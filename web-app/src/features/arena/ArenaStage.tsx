import { useState, type CSSProperties } from 'react'
import { asPokemonType as safeType } from '../../types/pokemon'
import { HpBar, TypeBadge, cx, formatName } from '../../ui'

const ARENA_IMAGE = '/arena/stadium.webp'

/**
 * Where the two battle spots are in the arena image, as a percentage of its width and height (measured on the
 * shipped image, see docs/arena-art.md). If the art is replaced and the spots move, change these numbers.
 */
const ARENA_SPOTS = [{ x: 24, y: 73 }, { x: 76, y: 73 }] as const

// On phones the stage is 4:3 and the wider image is cropped at the sides: map a horizontal position to the cropped view
const IMAGE_ASPECT = 1376 / 768
const CROP = (4 / 3) / IMAGE_ASPECT
// Clamped so a fighter is never cut by the frame: the spots themselves are half cropped on a phone
const onPhone = (x: number): number => Math.min(82, Math.max(18, (x - 50) / CROP + 50))

interface StageFighter {
  name: string
  image: string
  types: string[]
}

export interface FighterEffect {
  attacking?: boolean
  hit?: boolean
  fainted?: boolean
  victorious?: boolean
  /** Move being used, shown above the attacker */
  move?: { label: string, type: string }
  /** Result floating above the target; `key` restarts the animation for each hit */
  popup?: { key: number, text: string, note?: string, tone: 'damage' | 'crit' | 'miss' }
}

interface ArenaStageProps {
  fighters: [StageFighter, StageFighter]
  /** Current and max HP of each fighter, for turn-based battles */
  hp?: { current: number, max: number }[]
  effects?: [FighterEffect | undefined, FighterEffect | undefined]
}

const popupTone = { damage: 'text-danger', crit: 'text-danger text-4xl', miss: 'text-muted' }

/** Name, types and HP of a fighter, in the top corner on its side like in the games */
function Hud({ fighter, side, hp }: { fighter: StageFighter, side: 0 | 1, hp?: { current: number, max: number } }) {
  const name = formatName(fighter.name)
  return (
    <div
      className={cx(
        'absolute top-2 z-20 w-[44%] max-w-[250px] rounded-lg border border-border bg-surface/85 p-1.5 backdrop-blur-sm sm:top-3 sm:p-2',
        side === 0 ? 'left-2 sm:left-3' : 'right-2 sm:right-3',
      )}
    >
      <div className="truncate text-sm font-semibold sm:text-base">{name}</div>
      {/* Type badges are on the fighter's card and the grid already: on a phone the panel stays small */}
      <div className="my-1 hidden flex-wrap gap-1 sm:flex">{fighter.types.map((t) => <TypeBadge key={t} type={safeType(t)} />)}</div>
      {hp && <HpBar label={name} current={hp.current} max={hp.max} />}
    </div>
  )
}

function Fighter({ fighter, side, effect }: { fighter: StageFighter, side: 0 | 1, effect?: FighterEffect }) {
  const spot = ARENA_SPOTS[side]
  const position = { top: `${spot.y}%`, '--x-phone': `${onPhone(spot.x)}%`, '--x-wide': `${spot.x}%` } as CSSProperties
  return (
    // Positioned by the outer box (transform); the inner box carries the entrance animation
    <div
      className="absolute z-10 w-[34%] max-w-[300px] -translate-x-1/2 sm:w-[32%] -translate-y-[90%] left-[var(--x-phone)] sm:left-[var(--x-wide)]"
      style={position}
    >
      <div className={cx('relative', side === 0 ? 'animate-slide-in-left' : 'animate-slide-in-right')}>
        {effect?.move && (
          <span key={effect.move.label} className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 animate-pop-in whitespace-nowrap">
            <TypeBadge type={safeType(effect.move.type)} label={effect.move.label} />
          </span>
        )}
        {effect?.popup && (
          <div key={effect.popup.key} className="pointer-events-none absolute inset-x-0 top-1/4 z-10 animate-float-up text-center">
            <div className={cx('text-3xl font-black [text-shadow:0_2px_10px_rgb(var(--surface))]', popupTone[effect.popup.tone])}>{effect.popup.text}</div>
            {effect.popup.note && <div className="text-xs font-semibold text-fg [text-shadow:0_1px_6px_rgb(var(--surface))]">{effect.popup.note}</div>}
          </div>
        )}
        {/* floor shadow, under the feet */}
        <div className="absolute inset-x-[15%] bottom-[3%] h-[9%] rounded-full bg-black/30 blur-sm" aria-hidden />
        <img
          src={fighter.image}
          alt={formatName(fighter.name)}
          className={cx(
            'relative aspect-square w-full object-contain transition-all duration-700',
            effect?.attacking && (side === 0 ? 'animate-lunge-right' : 'animate-lunge-left'),
            effect?.hit && 'animate-hit-shake',
            effect?.fainted && 'translate-y-3 rotate-6 opacity-50 grayscale',
            effect?.victorious && 'animate-victory',
          )}
        />
      </div>
    </div>
  )
}

/**
 * The battle scene: the arena image behind two fighters standing on their spots, with a name/HP panel in each top corner.
 * Without the image (or if it fails to load) it falls back to a stage tinted with the fighters' type colours.
 */
export function ArenaStage({ fighters, hp, effects }: ArenaStageProps) {
  const [imageMissing, setImageMissing] = useState(false)
  const [a, b] = [safeType(fighters[0].types[0]), safeType(fighters[1].types[0])]
  const glow = imageMissing ? 0.3 : 0.18
  const background = [
    `radial-gradient(65% 90% at 20% 75%, rgb(var(--type-${a}) / ${glow}), transparent 70%)`,
    `radial-gradient(65% 90% at 80% 75%, rgb(var(--type-${b}) / ${glow}), transparent 70%)`,
    ...(imageMissing ? ['linear-gradient(to top, rgb(var(--surface-2) / 0.9), transparent 45%)'] : []),
  ].join(', ')

  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-card border border-border sm:aspect-[43/24]">
      {!imageMissing && (
        <img src={ARENA_IMAGE} alt="" className="absolute inset-0 size-full object-cover" onError={() => setImageMissing(true)} />
      )}
      <div className="absolute inset-0" style={{ background }} aria-hidden />

      <Hud fighter={fighters[0]} side={0} hp={hp?.[0]} />
      <Hud fighter={fighters[1]} side={1} hp={hp?.[1]} />

      <Fighter fighter={fighters[0]} side={0} effect={effects?.[0]} />
      <Fighter fighter={fighters[1]} side={1} effect={effects?.[1]} />

      <div className="pointer-events-none absolute left-1/2 top-[55%] z-10 -translate-x-1/2 -translate-y-1/2" aria-hidden>
        <span className="block animate-pop-in text-3xl font-black text-white [text-shadow:0_2px_12px_rgb(0_0_0/0.6)]">VS</span>
      </div>
    </div>
  )
}
