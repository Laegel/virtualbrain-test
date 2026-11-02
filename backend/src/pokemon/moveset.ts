import { ApiMove, ApiPokemon, idFromUrl, NamedResource } from './pokeapi.mapper'
import type { Move, StatBlock } from './pokemon.types'

const MOVES_PER_POKEMON = 4
const MAX_MOVES_PER_TYPE = 2

export const STRUGGLE: Move = { name: 'struggle', type: 'normal', power: 50, accuracy: 100, category: 'physical' }

// ponytail: moves whose mechanics the engine doesn't model (self-KO, recharge turn, conditions). Extend if a fight shows another.
const UNSUPPORTED = new Set([
	'explosion', 'self-destruct', 'misty-explosion', 'final-gambit', 'dream-eater', 'focus-punch', 'last-resort',
	'fake-out', 'sucker-punch', 'belch', 'steel-roller', 'synchronoise', 'hyper-beam', 'giga-impact', 'blast-burn',
	'frenzy-plant', 'hydro-cannon', 'roar-of-time', 'rock-wrecker', 'prismatic-laser', 'eternabeam', 'meteor-assault'
])

/** The moves a pokemon learns by level-up in the most recent game that has any: its "real" current moveset */
export function latestLevelUpMoves(pokemon: ApiPokemon): NamedResource[] {
	const levelUpGroups = (entry: ApiPokemon['moves'][number]) =>
		entry.version_group_details
			.filter(d => d.move_learn_method.name === 'level-up')
			.map(d => idFromUrl(d.version_group.url))

	const latest = Math.max(0, ...pokemon.moves.flatMap(levelUpGroups))
	if (latest === 0) return pokemon.moves.map(m => m.move)
	return pokemon.moves.filter(entry => levelUpGroups(entry).includes(latest)).map(m => m.move)
}

/** Best damaging moves for this pokemon: power x accuracy x STAB x the stat the move uses, at most 2 per type for coverage */
export function pickMoveset(candidates: ApiMove[], types: string[], stats: StatBlock): Move[] {
	const scored = candidates
		.filter(m => m.power && !UNSUPPORTED.has(m.name) && ['physical', 'special'].includes(m.damage_class.name))
		.map(m => {
			const move: Move = {
				name: m.name,
				type: m.type.name,
				power: m.power as number,
				accuracy: m.accuracy ?? 100, // never-miss moves have no accuracy
				category: m.damage_class.name as Move['category']
			}
			const stat = move.category === 'physical' ? stats.attack : stats.special_attack
			const score = move.power * (move.accuracy / 100) * (types.includes(move.type) ? 1.5 : 1) * stat
			return { move, score }
		})
		.sort((a, b) => b.score - a.score)

	const picked: Move[] = []
	const perType = new Map<string, number>()
	for (const { move } of scored) {
		if (picked.length === MOVES_PER_POKEMON) break
		if ((perType.get(move.type) ?? 0) >= MAX_MOVES_PER_TYPE) continue
		picked.push(move)
		perType.set(move.type, (perType.get(move.type) ?? 0) + 1)
	}
	return picked.length ? picked : [STRUGGLE]
}
