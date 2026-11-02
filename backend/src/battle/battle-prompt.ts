import { formatName } from '../common/format-name'
import type { PokemonSummary } from '../pokemon/pokemon.types'

const describe = ({ name, types, stats }: PokemonSummary): string =>
	`- ${formatName(name)}: ${types.join('/')} type, HP ${stats.HP}, Attack ${stats.attack}, Defense ${stats.defense}, Speed ${stats.speed}`

/**
 * Prompt for a one-shot battle. Built only from our own validated data, never from client text.
 * The output is rendered as plain text by the UI, hence "no markdown".
 */
export function buildBattlePrompt(first: PokemonSummary, second: PokemonSummary): string {
	return [
		`Simulate a Pokémon battle between ${formatName(first.name)} and ${formatName(second.name)}.`,
		'The data below is authoritative for types and base stats. Use your knowledge base only for extra details (abilities, type matchups).',
		'If it has nothing on one of them, narrate from the data below and never mention missing documents or your knowledge base.',
		'',
		describe(first),
		describe(second),
		'',
		'Rules:',
		'- Narrate 4 to 6 rounds, one short paragraph each, each starting with "Round N:".',
		'- Let the type matchups and base stats decide the outcome, and mention them.',
		'- Plain text only, no markdown.',
		`- End with one final line: "Winner: <name>".`
	].join('\n')
}
