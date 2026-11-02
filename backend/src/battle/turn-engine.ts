import type { Move, StatBlock } from '../pokemon/pokemon.types'

/** Fixed level 50 with 31 IVs and no EVs: HP = base + 75, other stats = base + 20 */
const LEVEL = 50
export const maxHpOf = (baseHp: number): number => baseHp + 75
const effectiveStat = (base: number): number => base + 20

export interface Fighter {
	id: number
	name: string
	image: string
	types: string[]
	/** Base stats */
	stats: StatBlock
	maxHp: number
	moves: Move[]
	/** Attacking type -> damage multiplier this fighter takes */
	takes: Record<string, number>
}

export interface RoundAction {
	fighter: string
	target: string
	move: string
	missed: boolean
	damage: number
	effectiveness: number
	critical: boolean
	/** Target HP after the hit */
	hpAfter: number
	fainted: boolean
}

export type Rng = () => number
export type Pair<T> = [T, T]

export function calcDamage(attacker: Fighter, defender: Fighter, move: Move, rng: Rng) {
	const effectiveness = defender.takes[move.type] ?? 1
	if (effectiveness === 0) return { damage: 0, effectiveness, critical: false }

	const [attack, defense] = move.category === 'physical'
		? [attacker.stats.attack, defender.stats.defense]
		: [attacker.stats.special_attack, defender.stats.special_defense]
	const base = Math.floor(Math.floor((2 * LEVEL) / 5 + 2) * move.power * effectiveStat(attack) / effectiveStat(defense) / 50) + 2

	const critical = rng() < 1 / 24
	const stab = attacker.types.includes(move.type) ? 1.5 : 1
	const variance = 0.85 + rng() * 0.15
	const damage = Math.max(1, Math.floor(base * stab * effectiveness * variance * (critical ? 1.5 : 1)))
	return { damage, effectiveness, critical }
}

/** Highest expected damage (accuracy included): what the server plays when the LLM gives no usable answer */
export function bestMove(attacker: Fighter, defender: Fighter): Move {
	const expected = (move: Move) => calcDamage(attacker, defender, move, () => 0.5).damage * (move.accuracy / 100)
	return attacker.moves.reduce((best, move) => (expected(move) > expected(best) ? move : best))
}

/**
 * One round: the faster fighter acts first (ties by coin flip), a fainted fighter does not act.
 * Priority moves, status effects and items are out of scope.
 */
export function resolveRound(fighters: Pair<Fighter>, hp: Pair<number>, moveNames: Pair<string>, rng: Rng) {
	const remaining: Pair<number> = [hp[0], hp[1]]
	const speeds = fighters.map(f => f.stats.speed)
	const order: Pair<0 | 1> = speeds[0] === speeds[1]
		? (rng() < 0.5 ? [0, 1] : [1, 0])
		: (speeds[0] > speeds[1] ? [0, 1] : [1, 0])

	const actions: RoundAction[] = []
	for (const attackerIndex of order) {
		if (remaining[attackerIndex] === 0) continue
		const targetIndex = attackerIndex === 0 ? 1 : 0
		const attacker = fighters[attackerIndex]
		const defender = fighters[targetIndex]
		const move = attacker.moves.find(m => m.name === moveNames[attackerIndex])
		if (!move) throw new Error(`${attacker.name} does not know ${moveNames[attackerIndex]}`)

		const missed = rng() * 100 >= move.accuracy
		const { damage, effectiveness, critical } = missed
			? { damage: 0, effectiveness: 1, critical: false }
			: calcDamage(attacker, defender, move, rng)
		remaining[targetIndex] = Math.max(0, remaining[targetIndex] - damage)

		actions.push({
			fighter: attacker.name, target: defender.name, move: move.name,
			missed, damage, effectiveness, critical,
			hpAfter: remaining[targetIndex], fainted: remaining[targetIndex] === 0
		})
	}
	return { actions, hp: remaining }
}

/** When the round limit is hit: highest remaining HP share wins, then the faster one */
export function winnerByHealth(fighters: Pair<Fighter>, hp: Pair<number>): Fighter {
	const share = hp.map((h, i) => h / fighters[i].maxHp)
	if (share[0] !== share[1]) return share[0] > share[1] ? fighters[0] : fighters[1]
	return fighters[1].stats.speed > fighters[0].stats.speed ? fighters[1] : fighters[0]
}
