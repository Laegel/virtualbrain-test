import type { Move } from '../pokemon/pokemon.types'
import type { Pair, RoundAction } from './turn-engine'

export interface PublicFighter {
	id: number
	name: string
	image: string
	types: string[]
	maxHp: number
	moves: Move[]
}

/** One line of the NDJSON stream sent to the browser */
export type TurnEvent =
	| { type: 'start', fighters: Pair<PublicFighter> }
	| { type: 'round', round: number, actions: RoundAction[], hp: Pair<number>, source: 'llm' | 'fallback' }
	| { type: 'end', winner: string, reason: 'ko' | 'round-limit' }
	| { type: 'error', message: string }
