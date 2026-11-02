import type { ButtonHTMLAttributes } from 'react'
import type { PokemonTypeName } from '../types/pokemon'
import { cx } from './cx'

// Full class names (not built from the type) so Tailwind can see them
const background: Record<PokemonTypeName, string> = {
  normal: 'bg-type-normal', fire: 'bg-type-fire', water: 'bg-type-water', electric: 'bg-type-electric',
  grass: 'bg-type-grass', ice: 'bg-type-ice', fighting: 'bg-type-fighting', poison: 'bg-type-poison',
  ground: 'bg-type-ground', flying: 'bg-type-flying', psychic: 'bg-type-psychic', bug: 'bg-type-bug',
  rock: 'bg-type-rock', ghost: 'bg-type-ghost', dragon: 'bg-type-dragon', dark: 'bg-type-dark',
  steel: 'bg-type-steel', fairy: 'bg-type-fairy',
}

const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize text-white'

export function TypeBadge({ type, label }: { type: PokemonTypeName, label?: string }) {
  return <span className={cx(base, background[type])}>{label ?? type}</span>
}

interface TypeToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  type: PokemonTypeName
  pressed: boolean
}

/** Filter chip: a type badge that can be switched on and off */
export function TypeToggle({ type, pressed, className, ...props }: TypeToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cx(base, 'transition-opacity', background[type], !pressed && 'opacity-40 hover:opacity-70', className)}
      {...props}
    >
      {type}
    </button>
  )
}
