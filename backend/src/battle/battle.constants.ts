/** Injection token for the overall time limits of a fight */
export const BATTLE_DEADLINES = Symbol('BATTLE_DEADLINES')

export interface BattleDeadlines {
	narratedMs: number
	turnBasedMs: number
}

// A narrated fight takes about 20 s and a turn-based one about 13 s per round (up to 12 rounds, a retry doubles a round)
export const DEFAULT_DEADLINES: BattleDeadlines = { narratedMs: 3 * 60_000, turnBasedMs: 6 * 60_000 }

/** Fights running at the same time, all clients together: each one costs upstream calls we do not control */
export const MAX_CONCURRENT_BATTLES = 4
