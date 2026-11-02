import { formatName } from '../common/format-name'
import type { Pokemon } from '../pokemon/pokemon.types'

/** Names come from PokeAPI, but this ends up in files fed to an LLM: neutralise table/markdown control characters */
const esc = (text: string): string => text.replace(/[\\`*_{}[\]<>()#+|!]/g, '\\$&').replace(/\s+/g, ' ').trim()

const title = (name: string): string => esc(formatName(name))

const matchups = (pokemon: Pokemon, relation: string): string => {
	const names = pokemon.apiResistances.filter(r => r.damage_relation === relation).map(r => r.name)
	return names.length ? names.join(', ') : 'none'
}

/** Pure conversion of a Pokemon to the markdown document imported in the brain */
export function pokemonToMarkdown(pokemon: Pokemon): string {
	const { stats } = pokemon
	return [
		`# ${title(pokemon.name)}`,
		'',
		`- **Pokedex number:** ${pokemon.pokedexId}`,
		`- **Generation:** ${pokemon.apiGeneration}`,
		`- **Types:** ${pokemon.apiTypes.map(t => t.name).join(', ')}`,
		`- **Abilities:** ${pokemon.abilities.map(a => esc(a)).join(', ') || 'none'}`,
		`- **Evolves from:** ${pokemon.apiPreEvolution === 'none' ? 'nothing' : esc(pokemon.apiPreEvolution)}`,
		`- **Evolves into:** ${pokemon.apiEvolutions.map(e => esc(e.name)).join(', ') || 'nothing'}`,
		'',
		'## Base stats',
		'',
		'| Stat | Value |',
		'| --- | --- |',
		`| HP | ${stats.HP} |`,
		`| Attack | ${stats.attack} |`,
		`| Defense | ${stats.defense} |`,
		`| Special Attack | ${stats.special_attack} |`,
		`| Special Defense | ${stats.special_defense} |`,
		`| Speed | ${stats.speed} |`,
		'',
		'## Type matchups (damage taken)',
		'',
		`- **Immune to:** ${matchups(pokemon, 'immune')}`,
		`- **Takes 4x from:** ${matchups(pokemon, 'twice_vulnerable')}`,
		`- **Takes 2x from:** ${matchups(pokemon, 'vulnerable')}`,
		`- **Takes 0.5x from:** ${matchups(pokemon, 'resistant')}`,
		`- **Takes 0.25x from:** ${matchups(pokemon, 'twice_resistant')}`,
		''
	].join('\n')
}

/** Safe, deterministic file name: built from numeric id + a sanitised slug, never from raw input */
export const markdownFileName = (pokemon: Pokemon): string =>
	`${String(pokemon.id).padStart(3, '0')}-${pokemon.slug.replace(/[^a-z0-9-]/g, '')}.md`
