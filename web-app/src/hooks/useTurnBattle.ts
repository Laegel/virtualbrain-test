import { useCallback, useEffect, useReducer, useState } from 'react'
import { streamTurnBattle } from '../api/turnBattle'
import type { BattleFighter, Pair, RoundEvent, TurnEvent } from '../types/turn-battle'

export interface TurnBattleState {
  status: 'connecting' | 'fighting' | 'done' | 'error'
  fighters?: Pair<BattleFighter>
  rounds: RoundEvent[]
  hp?: Pair<number>
  winner?: string
  reason?: 'ko' | 'round-limit'
}

type Action = TurnEvent | { type: 'reset' } | { type: 'closed' }

const initial: TurnBattleState = { status: 'connecting', rounds: [] }

function reducer(state: TurnBattleState, action: Action): TurnBattleState {
  switch (action.type) {
    case 'reset':
      return initial
    case 'start':
      return { ...state, status: 'fighting', fighters: action.fighters, hp: [action.fighters[0].maxHp, action.fighters[1].maxHp] }
    case 'round':
      return { ...state, rounds: [...state.rounds, action], hp: action.hp }
    case 'end':
      return { ...state, status: 'done', winner: action.winner, reason: action.reason }
    case 'error':
      return { ...state, status: 'error' }
    case 'closed':
      // The stream ended without an `end` event: the fight was cut short
      return state.status === 'done' ? state : { ...state, status: 'error' }
  }
}

/** Starts a turn-based battle on mount (and on `restart`) and folds the streamed events into one state */
export function useTurnBattle(fighterIds: number[]) {
  const [state, dispatch] = useReducer(reducer, initial)
  const [run, setRun] = useState(0)
  const key = fighterIds.join(',')

  useEffect(() => {
    const controller = new AbortController()
    dispatch({ type: 'reset' })
    streamTurnBattle(key.split(',').map(Number), dispatch, controller.signal)
      .then(() => dispatch({ type: 'closed' }))
      .catch(() => { if (!controller.signal.aborted) dispatch({ type: 'error', message: 'failed' }) })
    return () => controller.abort()
  }, [key, run])

  const restart = useCallback(() => setRun((n) => n + 1), [])

  return { ...state, run, restart }
}
