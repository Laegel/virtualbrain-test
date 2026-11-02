import { useBattlePlayback, type PlaybackStep } from '../../hooks/useBattlePlayback'
import { useTurnBattle } from '../../hooks/useTurnBattle'
import type { PokemonSummary } from '../../types/pokemon'
import type { RoundAction } from '../../types/turn-battle'
import { Button, Spinner, Surface, formatName } from '../../ui'
import { ArenaStage, type FighterEffect } from './ArenaStage'

function describe(action: RoundAction): string {
  const who = formatName(action.fighter)
  const move = formatName(action.move)
  if (action.missed) return `${who} used ${move} but missed.`
  const effect = action.effectiveness === 0 ? ' It had no effect.'
    : action.effectiveness > 1 ? ' Super effective!'
    : action.effectiveness < 1 ? ' Not very effective.' : ''
  return `${who} used ${move}.${effect}${action.critical ? ' Critical hit!' : ''} ${formatName(action.target)} lost ${action.damage} HP.${action.fainted ? ` ${formatName(action.target)} fainted!` : ''}`
}

/** Result shown over the target when a hit lands */
function popupFor(action: RoundAction, key: number): NonNullable<FighterEffect['popup']> {
  if (action.missed) return { key, text: 'Miss', tone: 'miss' }
  if (action.effectiveness === 0) return { key, text: 'No effect', tone: 'miss' }
  const note = action.effectiveness > 1 ? 'Super effective!' : action.effectiveness < 1 ? 'Not very effective' : undefined
  return { key, text: `${action.critical ? 'Critical! ' : ''}−${action.damage}`, note, tone: action.critical ? 'crit' : 'damage' }
}

/** The visible steps, grouped by round, in the order they landed */
function groupByRound(steps: PlaybackStep[]) {
  const rounds: { round: number, source: PlaybackStep['source'], actions: RoundAction[] }[] = []
  for (const { round, source, action } of steps) {
    const last = rounds[rounds.length - 1]
    if (last?.round === round) last.actions.push(action)
    else rounds.push({ round, source, actions: [action] })
  }
  return rounds
}

export function TurnBasedArena({ fighters }: { fighters: PokemonSummary[] }) {
  const battle = useTurnBattle(fighters.map((f) => f.id))
  const playback = useBattlePlayback(battle.rounds, battle.fighters, battle.run)
  const { current } = playback

  const hp = battle.fighters && playback.hp
    ? battle.fighters.map((f, i) => ({ current: playback.hp![i], max: f.maxHp }))
    : undefined

  const over = battle.status === 'done' || battle.status === 'error'
  const settled = over && playback.idle
  const waiting = !over && playback.idle

  const effectFor = (i: 0 | 1): FighterEffect | undefined => {
    const fighter = battle.fighters?.[i]
    if (!fighter) return undefined
    const attacker = current?.attacker === i
    const move = attacker ? fighter.moves.find((m) => m.name === current.step.action.move) : undefined
    return {
      attacking: attacker && current.phase === 'attack',
      hit: current?.target === i && current.phase === 'hit' && current.step.action.damage > 0,
      fainted: playback.hp?.[i] === 0,
      victorious: settled && battle.winner === fighter.name,
      move: move && { label: formatName(move.name), type: move.type },
      popup: current?.target === i && current.phase === 'hit' ? popupFor(current.step.action, current.index) : undefined,
    }
  }

  return (
    <>
      <ArenaStage fighters={[fighters[0], fighters[1]]} hp={hp} effects={[effectFor(0), effectFor(1)]} />
      <Surface className="flex flex-col gap-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Battle log</h2>
          {settled && <Button size="sm" variant="secondary" onClick={battle.restart}>Fight again</Button>}
        </div>

        <ol className="flex flex-col gap-3" aria-live="polite">
          {groupByRound(playback.visible).map(({ round, source, actions }) => (
            <li key={round} className="flex flex-col gap-1 border-t border-border pt-3 first:border-t-0 first:pt-0">
              <h3 className="text-sm font-semibold text-muted">Round {round}</h3>
              {actions.map((action, i) => <p key={i} className="animate-fade-up">{describe(action)}</p>)}
              {source === 'fallback' && (
                <p className="text-xs text-muted">The AI gave no usable answer this round, so the arena picked the attacks.</p>
              )}
            </li>
          ))}
        </ol>

        {waiting && <Spinner label={battle.status === 'connecting' ? 'Preparing the arena…' : 'Choosing the next attacks…'} />}
        {settled && battle.status === 'done' && battle.winner && (
          <p className="animate-pop-in text-lg font-bold">
            {formatName(battle.winner)} wins{battle.reason === 'round-limit' ? ' on points (round limit reached)' : ''}!
          </p>
        )}
        {settled && battle.status === 'error' && <p className="text-danger">The battle was interrupted. Try again.</p>}
      </Surface>
    </>
  )
}
