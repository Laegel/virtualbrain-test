import { latestLevelUpMoves, pickMoveset, STRUGGLE } from './moveset'
import type { ApiMove, ApiPokemon } from './pokeapi.mapper'
import type { StatBlock } from './pokemon.types'

const resource = (name: string, id?: number) => ({ name, url: `https://pokeapi.co/api/v2/${id ? 'version-group' : 'x'}/${id ?? 1}/` })
const apiMove = (name: string, type: string, power: number | null, damageClass = 'physical', accuracy: number | null = 100): ApiMove =>
	({ name, power, accuracy, type: resource(type), damage_class: resource(damageClass) })

const stats: StatBlock = { HP: 50, attack: 120, defense: 50, special_attack: 40, special_defense: 50, speed: 50 }

describe('latestLevelUpMoves', () => {
	const entry = (move: string, ...details: [string, number][]) => ({
		move: resource(move),
		version_group_details: details.map(([method, group]) => ({ move_learn_method: resource(method), version_group: resource('g', group) }))
	})

	it('keeps the moves learned by level-up in the newest game that has any', () => {
		const pokemon = { moves: [
			entry('old-move', ['level-up', 5]),
			entry('new-move', ['level-up', 5], ['level-up', 20]),
			entry('machine-only', ['machine', 25]),
			entry('newest', ['level-up', 20])
		] } as unknown as ApiPokemon
		expect(latestLevelUpMoves(pokemon).map(m => m.name)).toEqual(['new-move', 'newest'])
	})

	it('falls back to every move when there is no level-up data', () => {
		const pokemon = { moves: [entry('a', ['machine', 1]), entry('b', ['egg', 1])] } as unknown as ApiPokemon
		expect(latestLevelUpMoves(pokemon).map(m => m.name)).toEqual(['a', 'b'])
	})
})

describe('pickMoveset', () => {
	it('keeps only supported damaging moves', () => {
		const moves = pickMoveset([
			apiMove('growl', 'normal', null, 'status'),
			apiMove('explosion', 'normal', 250),
			apiMove('tackle', 'normal', 40)
		], ['normal'], stats)
		expect(moves.map(m => m.name)).toEqual(['tackle'])
	})

	it('prefers STAB and the stat that matches the category', () => {
		const moves = pickMoveset([
			apiMove('stab-physical', 'fire', 60),
			apiMove('plain-physical', 'water', 60),
			apiMove('stab-special', 'fire', 60, 'special')
		], ['fire'], stats)
		// Attack 120 vs Sp.Atk 40: even without STAB, the physical move outranks the STAB special one
		expect(moves.map(m => m.name)).toEqual(['stab-physical', 'plain-physical', 'stab-special'])
	})

	it('takes at most 2 moves per type and 4 in total', () => {
		const moves = pickMoveset([
			apiMove('f1', 'fire', 100), apiMove('f2', 'fire', 90), apiMove('f3', 'fire', 80),
			apiMove('w1', 'water', 50), apiMove('g1', 'grass', 40), apiMove('r1', 'rock', 30)
		], ['normal'], stats)
		expect(moves).toHaveLength(4)
		expect(moves.filter(m => m.type === 'fire')).toHaveLength(2)
	})

	it('treats a missing accuracy as 100 and returns struggle when nothing damages', () => {
		expect(pickMoveset([apiMove('aerial-ace', 'flying', 60, 'physical', null)], ['normal'], stats)[0].accuracy).toBe(100)
		expect(pickMoveset([apiMove('growl', 'normal', null, 'status')], ['normal'], stats)).toEqual([STRUGGLE])
	})
})
