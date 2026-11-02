import { useEffect, useMemo, useState } from 'react'
import type { BattleFighter, Pair, RoundAction, RoundEvent } from '../types/turn-battle'

export interface PlaybackStep {
  round: number
  source: RoundEvent['source']
  action: RoundAction
}

export type PlaybackPhase = 'attack' | 'hit'

// Time the attacker spends winding up, then the time the hit stays on screen
const timings = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ? { attack: 150, hit: 350 }
  : { attack: 550, hit: 1000 }

/**
 * The server sends a whole round at once; this plays its actions one at a time so the arena can animate each hit.
 * HP and the log only change when a hit lands. While the next round is still being chosen, `idle` is true.
 */
export function useBattlePlayback(rounds: RoundEvent[], fighters: Pair<BattleFighter> | undefined, resetKey: number) {
  const steps = useMemo<PlaybackStep[]>(
    () => rounds.flatMap((r) => r.actions.map((action) => ({ round: r.round, source: r.source, action }))),
    [rounds],
  )
  const [played, setPlayed] = useState(0)
  const [phase, setPhase] = useState<PlaybackPhase | null>(null)
  const pending = steps.length > played

  useEffect(() => {
    setPlayed(0)
    setPhase(null)
  }, [resetKey])

  useEffect(() => {
    if (!pending) {
      setPhase(null)
      return
    }
    const t = timings()
    setPhase('attack')
    const toHit = setTimeout(() => setPhase('hit'), t.attack)
    const toNext = setTimeout(() => setPlayed((n) => n + 1), t.attack + t.hit)
    return () => { clearTimeout(toHit); clearTimeout(toNext) }
  }, [played, pending])

  const current = pending ? steps[played] : undefined
  const names = fighters?.map((f) => f.name)
  const indexOf = (name: string) => names?.indexOf(name) ?? -1
  const landed = played + (current && phase === 'hit' ? 1 : 0)

  // HP of each fighter after the last hit that has landed
  const hp = fighters
    ? fighters.map((f, i) => {
        for (let n = landed - 1; n >= 0; n--) {
          if (indexOf(steps[n].action.target) === i) return steps[n].action.hpAfter
        }
        return f.maxHp
      }) as Pair<number>
    : undefined

  return {
    hp,
    /** Steps whose hit has landed: what the log shows */
    visible: steps.slice(0, landed),
    current: current && phase
      ? { step: current, phase, attacker: indexOf(current.action.fighter), target: indexOf(current.action.target), index: played }
      : undefined,
    /** Nothing is being played: either the fight is waiting for the next round or it is over */
    idle: !pending,
  }
}
