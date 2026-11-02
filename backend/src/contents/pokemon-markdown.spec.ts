import type { Pokemon } from '../pokemon/pokemon.types'
import { markdownFileName, pokemonToMarkdown } from './pokemon-markdown'

const fixture = (overrides: Partial<Pokemon> = {}): Pokemon => ({
	id: 7, pokedexId: 7, name: 'squirtle', image: '', sprite: '', slug: 'squirtle',
	stats: { HP: 44, attack: 48, defense: 65, special_attack: 50, special_defense: 64, speed: 43 },
	apiTypes: [{ name: 'water', image: '' }],
	apiGeneration: 1,
	apiResistances: [
		{ name: 'electric', damage_multiplier: 2, damage_relation: 'vulnerable' },
		{ name: 'fire', damage_multiplier: 0.5, damage_relation: 'resistant' }
	],
	resistanceModifyingAbilitiesForApi: { name: 'torrent', slug: 'torrent' },
	apiEvolutions: [{ name: 'wartortle', pokedexId: 8 }],
	apiPreEvolution: 'none',
	apiResistancesWithAbilities: [],
	abilities: ['torrent', 'rain-dish'],
	...overrides
})

describe('pokemonToMarkdown', () => {
	it('renders name, types, stats and matchups', () => {
		const md = pokemonToMarkdown(fixture())
		expect(md).toContain('# Squirtle')
		expect(md).toContain('**Types:** water')
		expect(md).toContain('| HP | 44 |')
		expect(md).toContain('**Takes 2x from:** electric')
		expect(md).toContain('**Takes 0.5x from:** fire')
		expect(md).toContain('**Immune to:** none')
		expect(md).toContain('**Evolves into:** wartortle')
	})

	it('escapes markdown control characters in names', () => {
		const md = pokemonToMarkdown(fixture({ name: 'evil|*name' }))
		expect(md).toContain('# Evil\\|\\*Name')
	})
})

describe('markdownFileName', () => {
	it('pads the id and keeps only [a-z0-9-]', () => {
		expect(markdownFileName(fixture({ slug: '../mr-mime.md' }))).toBe('007-mr-mimemd.md')
	})
})
