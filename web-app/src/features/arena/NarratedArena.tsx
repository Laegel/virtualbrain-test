import { useBattle } from '../../hooks/useBattle'
import type { PokemonSummary } from '../../types/pokemon'
import { Button, Spinner, Surface } from '../../ui'
import { ArenaStage } from './ArenaStage'

export function NarratedArena({ fighters }: { fighters: PokemonSummary[] }) {
  const { text, status, restart } = useBattle(fighters.map((f) => f.id))

  return (
    <>
      <ArenaStage fighters={[fighters[0], fighters[1]]} />
      <Surface className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Battle report</h2>
          {status === 'streaming' && <Spinner label="Fighting…" />}
          {status !== 'streaming' && <Button size="sm" variant="secondary" onClick={restart}>Fight again</Button>}
        </div>
        {/* Rendered as plain text: LLM output is never injected as HTML */}
        <p className="min-h-24 whitespace-pre-wrap leading-relaxed" aria-live="polite">{text}</p>
        {status === 'error' && <p className="text-danger">The battle could not be generated. Try again.</p>}
      </Surface>
    </>
  )
}
