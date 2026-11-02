import { useDeferredValue, useMemo, useState } from 'react'
import { useSelection } from '../../hooks/useSelection'
import type { PokemonSummary, PokemonTypeName } from '../../types/pokemon'
import type { BattleMode } from '../arena/ArenaPage'
import { FilterBar } from './FilterBar'
import { PokemonGrid } from './PokemonGrid'
import { SelectionBar } from './SelectionBar'

const FIGHTERS_REQUIRED = 2

interface BrowsePageProps {
  pokemons: PokemonSummary[]
  onFight: (fighters: PokemonSummary[], mode: BattleMode) => void
}

export function BrowsePage({ pokemons, onFight }: BrowsePageProps) {
  const selection = useSelection(FIGHTERS_REQUIRED)
  const [query, setQuery] = useState('')
  const [types, setTypes] = useState<PokemonTypeName[]>([])
  const deferredQuery = useDeferredValue(query)

  // A pokemon matches if it has ANY of the selected types
  const filtered = useMemo(() => {
    const needle = deferredQuery.trim().toLowerCase()
    return pokemons.filter((p) =>
      (!needle || p.name.replace(/-/g, ' ').includes(needle)) &&
      (types.length === 0 || p.types.some((t) => types.includes(t))))
  }, [pokemons, deferredQuery, types])

  const fighters = useMemo(
    () => selection.ids.flatMap((id) => pokemons.find((p) => p.id === id) ?? []),
    [pokemons, selection.ids])

  const toggleType = (type: PokemonTypeName) =>
    setTypes((current) => current.includes(type) ? current.filter((t) => t !== type) : [...current, type])

  return (
    <>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-4">
        <FilterBar
          query={query} onQueryChange={setQuery}
          types={types} onToggleType={toggleType}
          onReset={() => { setQuery(''); setTypes([]) }}
          shown={filtered.length} total={pokemons.length}
        />
        <PokemonGrid pokemons={filtered} selectedIds={selection.ids} onToggle={selection.toggle} />
      </main>
      <SelectionBar
        fighters={fighters} required={FIGHTERS_REQUIRED}
        onClear={selection.clear}
        onFight={(mode) => onFight(fighters, mode)}
      />
    </>
  )
}
