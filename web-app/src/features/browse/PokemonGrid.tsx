import type { PokemonSummary } from '../../types/pokemon'
import { PokemonCard } from './PokemonCard'

interface PokemonGridProps {
  pokemons: PokemonSummary[]
  selectedIds: number[]
  onToggle: (id: number) => void
}

const STAGGER_MS = 35
const STAGGERED_CARDS = 16 // roughly one screen: the rest appear together instead of waiting in line

export function PokemonGrid({ pokemons, selectedIds, onToggle }: PokemonGridProps) {
  if (pokemons.length === 0) {
    return <p className="py-16 text-center text-muted">No Pokémon match these filters.</p>
  }
  return (
    <ul className="grid grid-cols-[repeat(auto-fill,minmax(9.75rem,1fr))] gap-3">
      {pokemons.map((pokemon, index) => {
        const order = selectedIds.indexOf(pokemon.id)
        return (
          // The entrance lives on the <li>: the card itself uses `transform` for its tilt
          <li key={pokemon.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(index, STAGGERED_CARDS) * STAGGER_MS}ms` }}>
            <PokemonCard pokemon={pokemon} selected={order !== -1} slot={order !== -1 ? order + 1 : undefined} onToggle={onToggle} />
          </li>
        )
      })}
    </ul>
  )
}
