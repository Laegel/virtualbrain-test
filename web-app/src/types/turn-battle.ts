export type Pair<T> = [T, T]

export interface Move {
  name: string
  type: string
  power: number
  accuracy: number
  category: 'physical' | 'special'
}

export interface BattleFighter {
  id: number
  name: string
  image: string
  types: string[]
  maxHp: number
  moves: Move[]
}

export interface RoundAction {
  fighter: string
  target: string
  move: string
  missed: boolean
  damage: number
  effectiveness: number
  critical: boolean
  hpAfter: number
  fainted: boolean
}

export interface RoundEvent {
  type: 'round'
  round: number
  actions: RoundAction[]
  hp: Pair<number>
  /** 'fallback': the AI gave no usable answer, the arena picked the attacks */
  source: 'llm' | 'fallback'
}

/** One line of the NDJSON stream from POST /battle/turn-based */
export type TurnEvent =
  | { type: 'start', fighters: Pair<BattleFighter> }
  | RoundEvent
  | { type: 'end', winner: string, reason: 'ko' | 'round-limit' }
  | { type: 'error', message: string }
