import type { DamageRelation, Evolution, Pokemon, PokemonSummary, Resistance, StatBlock } from './pokemon.types'

export interface NamedResource {
	name: string
	url: string
}

export interface ApiPokemon {
	id: number
	name: string
	sprites: {
		front_default: string | null
		other: { 'official-artwork': { front_default: string | null } }
	}
	stats: { base_stat: number, stat: NamedResource }[]
	types: { slot: number, type: NamedResource }[]
	abilities: { ability: NamedResource }[]
	species: NamedResource
	moves: {
		move: NamedResource
		version_group_details: { move_learn_method: NamedResource, version_group: NamedResource }[]
	}[]
}

export interface ApiMove {
	name: string
	power: number | null
	accuracy: number | null
	type: NamedResource
	damage_class: NamedResource
}

export interface ApiType {
	name: string
	damage_relations: {
		double_damage_from: NamedResource[]
		half_damage_from: NamedResource[]
		no_damage_from: NamedResource[]
	}
	sprites: { 'generation-viii': { 'sword-shield': { name_icon: string | null } } }
}

export interface ApiSpecies {
	name: string
	generation: NamedResource
	evolves_from_species: NamedResource | null
	evolution_chain: { url: string }
}

export interface ApiChainLink {
	species: NamedResource
	evolves_to: ApiChainLink[]
}

export interface ApiEvolutionChain {
	chain: ApiChainLink
}

export const ATTACKING_TYPES = [
	'normal', 'fire', 'water', 'electric', 'grass', 'ice',
	'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
	'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
]

const DAMAGE_RELATIONS: Record<number, DamageRelation> = {
	0: 'immune',
	0.25: 'twice_resistant',
	0.5: 'resistant',
	1: 'neutral',
	2: 'vulnerable',
	4: 'twice_vulnerable'
}

/** Extract the trailing id from a PokeAPI resource url (e.g. .../generation/1/) */
export const idFromUrl = (url: string): number => Number(url.split('/').filter(Boolean).pop())

const baseStat = (pokemon: ApiPokemon, name: string): number =>
	pokemon.stats.find(s => s.stat.name === name)?.base_stat ?? 0

export const statBlock = (pokemon: ApiPokemon): StatBlock => ({
	HP: baseStat(pokemon, 'hp'),
	attack: baseStat(pokemon, 'attack'),
	defense: baseStat(pokemon, 'defense'),
	special_attack: baseStat(pokemon, 'special-attack'),
	special_defense: baseStat(pokemon, 'special-defense'),
	speed: baseStat(pokemon, 'speed')
})

export const typeNames = (pokemon: ApiPokemon): string[] =>
	[...pokemon.types].sort((a, b) => a.slot - b.slot).map(t => t.type.name)

export const computeResistances = (types: ApiType[]): Resistance[] =>
	ATTACKING_TYPES.map(attacker => {
		const damage_multiplier = types.reduce((multiplier, { damage_relations: relations }) => {
			if (relations.no_damage_from.some(t => t.name === attacker)) return 0
			if (relations.double_damage_from.some(t => t.name === attacker)) return multiplier * 2
			if (relations.half_damage_from.some(t => t.name === attacker)) return multiplier * 0.5
			return multiplier
		}, 1)

		return { name: attacker, damage_multiplier, damage_relation: DAMAGE_RELATIONS[damage_multiplier] }
	})

const findChainLink = (link: ApiChainLink, speciesName: string): ApiChainLink | undefined =>
	link.species.name === speciesName
		? link
		: link.evolves_to.map(child => findChainLink(child, speciesName)).find(Boolean)

export const toSummary = (pokemon: ApiPokemon): PokemonSummary => ({
	id: pokemon.id,
	name: pokemon.name,
	image: pokemon.sprites.other['official-artwork'].front_default ?? pokemon.sprites.front_default ?? '',
	types: typeNames(pokemon),
	stats: statBlock(pokemon)
})

/** Adapt PokeAPI payloads to the legacy pokebuildapi `Pokemon` shape (plus `abilities`) */
export function toPokemon(pokemon: ApiPokemon, types: ApiType[], species: ApiSpecies, chain: ApiEvolutionChain): Pokemon {
	const apiEvolutions: Evolution[] = (findChainLink(chain.chain, species.name)?.evolves_to ?? [])
		.map(({ species: evolution }) => ({ name: evolution.name, pokedexId: idFromUrl(evolution.url) }))

	const apiResistances = computeResistances(types)
	const abilities = pokemon.abilities.map(a => a.ability.name)

	return {
		id: pokemon.id,
		pokedexId: pokemon.id,
		name: pokemon.name,
		image: pokemon.sprites.other['official-artwork'].front_default ?? '',
		sprite: pokemon.sprites.front_default ?? '',
		slug: pokemon.name,
		stats: statBlock(pokemon),
		apiTypes: types.map(type => ({
			name: type.name,
			image: type.sprites['generation-viii']['sword-shield'].name_icon ?? ''
		})),
		apiGeneration: idFromUrl(species.generation.url),
		apiResistances,
		// PokeAPI has no equivalent: best effort with the first ability
		resistanceModifyingAbilitiesForApi: { name: abilities[0] ?? '', slug: abilities[0] ?? '' },
		apiEvolutions,
		apiPreEvolution: species.evolves_from_species?.name ?? 'none',
		// PokeAPI does not compute ability effects on resistances
		apiResistancesWithAbilities: apiResistances,
		abilities
	}
}
