import type { Move } from '../pokemon/pokemon.types'
import { bestMove, calcDamage, Fighter, maxHpOf, resolveRound, winnerByHealth } from './turn-engine'

const move = (name: string, type: string, power: number, category: Move['category'] = 'physical', accuracy = 100): Move =>
	({ name, type, power, accuracy, category })

const fighter = (name: string, overrides: Partial<Fighter> = {}): Fighter => ({
	id: 1, name, image: '', types: ['normal'],
	stats: { HP: 50, attack: 100, defense: 50, special_attack: 80, special_defense: 40, speed: 50 },
	maxHp: maxHpOf(50), moves: [move('tackle', 'normal', 40)], takes: {},
	...overrides
})

const fixed = (value: number) => () => value
/** Returns the given values in order, then the last one forever */
const sequence = (...values: number[]) => { let i = 0; return () => values[Math.min(i++, values.length - 1)] }

describe('calcDamage', () => {
	const alpha = fighter('alpha', { types: ['fire'] })
	const beta = fighter('beta', { takes: { fire: 2, normal: 1, ghost: 0 } })

	it('follows the level 50 formula (STAB, 2x, no crit, mid variance)', () => {
		// base = floor(22 * 60 * (100+20) / (50+20) / 50) + 2 = 47; then 47 * 1.5 * 2 * 0.925 = 130.4
		expect(calcDamage(alpha, beta, move('flame-wheel', 'fire', 60), fixed(0.5))).toEqual({ damage: 130, effectiveness: 2, critical: false })
	})

	it('deals nothing to an immune target and at least 1 otherwise', () => {
		expect(calcDamage(alpha, beta, move('shadow-punch', 'ghost', 60), fixed(0.5)).damage).toBe(0)
		const tank = fighter('tank', { stats: { ...beta.stats, defense: 255 }, takes: { normal: 0.25 } })
		expect(calcDamage(fighter('weak', { stats: { ...beta.stats, attack: 1 } }), tank, move('poke', 'normal', 1), fixed(0.5)).damage).toBe(1)
	})

	it('ranks super effective above neutral and STAB above no STAB', () => {
		const fire = move('ember', 'fire', 60)
		const damageTo = (target: Fighter, attacker: Fighter) => calcDamage(attacker, target, fire, fixed(0.5)).damage
		expect(damageTo(beta, alpha)).toBeGreaterThan(damageTo(fighter('plain'), alpha))
		expect(damageTo(fighter('plain'), alpha)).toBeGreaterThan(damageTo(fighter('plain'), fighter('nostab')))
	})

	it('uses Attack/Defense for physical moves and the special stats for special ones', () => {
		const attacker = fighter('a', { stats: { ...alpha.stats, attack: 10, special_attack: 200 } })
		const defender = fighter('d', { stats: { ...alpha.stats, defense: 200, special_defense: 10 } })
		const physical = calcDamage(attacker, defender, move('p', 'normal', 60, 'physical'), fixed(0.5)).damage
		const special = calcDamage(attacker, defender, move('s', 'normal', 60, 'special'), fixed(0.5)).damage
		expect(special).toBeGreaterThan(physical * 5)
	})

	it('flags a critical hit when the roll is under 1/24', () => {
		expect(calcDamage(alpha, beta, move('tackle', 'normal', 40), sequence(0.01, 0.5)).critical).toBe(true)
	})
})

describe('resolveRound', () => {
	const fast = fighter('fast', { stats: { ...fighter('x').stats, speed: 100 }, moves: [move('strike', 'normal', 80)] })
	const slow = fighter('slow', { stats: { ...fighter('x').stats, speed: 10 }, moves: [move('strike', 'normal', 80)] })

	it('lets the faster fighter act first', () => {
		const { actions } = resolveRound([slow, fast], [200, 200], ['strike', 'strike'], fixed(0.5))
		expect(actions.map(a => a.fighter)).toEqual(['fast', 'slow'])
	})

	it('breaks speed ties with the rng', () => {
		const a = fighter('a')
		const b = fighter('b')
		expect(resolveRound([a, b], [200, 200], ['tackle', 'tackle'], sequence(0.1, 0.5)).actions[0].fighter).toBe('a')
		expect(resolveRound([a, b], [200, 200], ['tackle', 'tackle'], sequence(0.9, 0.5)).actions[0].fighter).toBe('b')
	})

	it('does not let a fighter act after being knocked out, and never goes below 0 HP', () => {
		const { actions, hp } = resolveRound([fast, slow], [200, 5], ['strike', 'strike'], fixed(0.5))
		expect(actions).toHaveLength(1)
		expect(actions[0]).toMatchObject({ fighter: 'fast', fainted: true, hpAfter: 0 })
		expect(hp).toEqual([200, 0])
	})

	it('deals no damage on a miss', () => {
		const shaky = fighter('shaky', { moves: [move('swing', 'normal', 100, 'physical', 50)] })
		const { actions } = resolveRound([shaky, fighter('target')], [200, 200], ['swing', 'tackle'], fixed(0.9))
		expect(actions.find(a => a.fighter === 'shaky')).toMatchObject({ missed: true, damage: 0 })
	})

	it('throws on a move the fighter does not know', () => {
		expect(() => resolveRound([fast, slow], [200, 200], ['hack', 'strike'], fixed(0.5))).toThrow(/does not know/)
	})
})

describe('bestMove', () => {
	it('picks the highest expected damage, accuracy included', () => {
		const attacker = fighter('a', { moves: [move('weak', 'normal', 40), move('risky', 'normal', 120, 'physical', 30), move('solid', 'normal', 90)] })
		expect(bestMove(attacker, fighter('d')).name).toBe('solid')
	})
})

describe('winnerByHealth', () => {
	const a = fighter('a', { maxHp: 100, stats: { ...fighter('x').stats, speed: 10 } })
	const b = fighter('b', { maxHp: 200, stats: { ...fighter('x').stats, speed: 90 } })

	it('goes by remaining HP share, not raw HP', () => {
		expect(winnerByHealth([a, b], [60, 100]).name).toBe('a')
	})

	it('falls back to speed on an equal share', () => {
		expect(winnerByHealth([a, b], [50, 100]).name).toBe('b')
	})
})
