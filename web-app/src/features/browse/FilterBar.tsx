import { Button, SearchInput, TypeToggle } from '../../ui'
import { POKEMON_TYPES, type PokemonTypeName } from '../../types/pokemon'

interface FilterBarProps {
  query: string
  onQueryChange: (query: string) => void
  types: PokemonTypeName[]
  onToggleType: (type: PokemonTypeName) => void
  onReset: () => void
  shown: number
  total: number
}

export function FilterBar({ query, onQueryChange, types, onToggleType, onReset, shown, total }: FilterBarProps) {
  const active = query !== '' || types.length > 0
  return (
    <section aria-label="Filters" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <SearchInput
          className="flex-1 sm:max-w-sm"
          placeholder="Search by name"
          aria-label="Search by name"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        <span className="text-sm text-muted tabular-nums" aria-live="polite">{shown} / {total}</span>
        {active && <Button variant="ghost" size="sm" onClick={onReset}>Reset</Button>}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by type">
        {POKEMON_TYPES.map((type) => (
          <TypeToggle key={type} type={type} pressed={types.includes(type)} onClick={() => onToggleType(type)} />
        ))}
      </div>
    </section>
  )
}
