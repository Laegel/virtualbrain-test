import { Button, Surface, formatName } from '../../ui'
import type { PokemonSummary } from '../../types/pokemon'
import type { BattleMode } from '../arena/ArenaPage'

interface SelectionBarProps {
  fighters: PokemonSummary[]
  required: number
  onClear: () => void
  onFight: (mode: BattleMode) => void
}

export function SelectionBar({ fighters, required, onClear, onFight }: SelectionBarProps) {
  const slots = Array.from({ length: required }, (_, i) => fighters[i])
  return (
    <div className="sticky bottom-0 z-10 border-t border-border bg-bg/90 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="flex flex-1 items-center gap-2">
          {slots.map((fighter, i) => (
            <Surface key={i} className="flex h-12 flex-1 items-center gap-2 px-2 text-sm sm:max-w-48">
              {fighter
                ? <><img src={fighter.image} alt="" className="size-9 object-contain" /><span className="truncate font-medium">{formatName(fighter.name)}</span></>
                : <span className="text-muted">Pick fighter {i + 1}</span>}
            </Surface>
          ))}
        </div>
        {fighters.length > 0 && <Button variant="ghost" onClick={onClear}>Clear</Button>}
        <Button variant="secondary" disabled={fighters.length < required} onClick={() => onFight('turn-based')}>Turn-based</Button>
        <Button disabled={fighters.length < required} onClick={() => onFight('narrated')}>Fight!</Button>
      </div>
    </div>
  )
}
