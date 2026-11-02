import { FiArrowLeft } from 'react-icons/fi'
import type { PokemonSummary } from '../../types/pokemon'
import { Button } from '../../ui'
import { NarratedArena } from './NarratedArena'
import { TurnBasedArena } from './TurnBasedArena'

export type BattleMode = 'narrated' | 'turn-based'

interface ArenaPageProps {
  fighters: PokemonSummary[]
  mode: BattleMode
  onBack: () => void
}

export function ArenaPage({ fighters, mode, onBack }: ArenaPageProps) {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-6">
      <div>
        <Button variant="ghost" onClick={onBack}><FiArrowLeft aria-hidden /> Back to the grid</Button>
      </div>
      {mode === 'turn-based' ? <TurnBasedArena fighters={fighters} /> : <NarratedArena fighters={fighters} />}
    </main>
  )
}
