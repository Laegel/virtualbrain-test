import { formatName } from '../common/format-name'
import type { Fighter, Pair, RoundAction } from './turn-engine'

const hpLine = (fighters: Pair<Fighter>, hp: Pair<number>): string =>
	fighters.map((f, i) => `${f.name} ${hp[i]}/${f.maxHp}`).join(', ')

const answerShape = (fighters: Pair<Fighter>): string =>
	`{"${fighters[0].name}":"<move>","${fighters[1].name}":"<move>"}`

const describeFighter = (f: Fighter, hp: number): string => {
	const moves = f.moves.map(m => `${m.name} (${m.type}, ${m.category}, power ${m.power}, accuracy ${m.accuracy})`).join('; ')
	return `- ${f.name}: ${f.types.join('/')} type, HP ${hp}/${f.maxHp}, Attack ${f.stats.attack}, Defense ${f.stats.defense}, `
		+ `Sp.Atk ${f.stats.special_attack}, Sp.Def ${f.stats.special_defense}, Speed ${f.stats.speed}. Moves: ${moves}`
}

/** First message of the session: rules, both fighters with their allowed moves, and turn 1 */
export function buildSetupPrompt(fighters: Pair<Fighter>, hp: Pair<number>): string {
	return [
		'You are choosing attacks for two Pokémon in a turn-based battle. You never narrate and never explain.',
		'Every turn you receive the state and must reply with ONLY one JSON object, nothing before or after it:',
		answerShape(fighters),
		'Each value must be exactly one move from that Pokémon\'s own list below. Choose the best move for each Pokémon',
		'from the type matchups, the stats and the current HP. The game computes damage itself.',
		'',
		describeFighter(fighters[0], hp[0]),
		describeFighter(fighters[1], hp[1]),
		'',
		`Turn 1. HP: ${hpLine(fighters, hp)}. Choose.`
	].join('\n')
}

const describeAction = (a: RoundAction): string => {
	if (a.missed) return `${formatName(a.fighter)} used ${a.move} and missed.`
	const effect = a.effectiveness === 0 ? 'it had no effect' : a.effectiveness > 1 ? 'super effective' : a.effectiveness < 1 ? 'not very effective' : 'normal effectiveness'
	return `${formatName(a.fighter)} used ${a.move}: ${effect}, ${a.damage} damage${a.critical ? ' (critical hit)' : ''}.`
}

/** Result of the previous round, sent in the same session so the LLM plays the next one */
export function buildRoundPrompt(round: number, previous: RoundAction[], fighters: Pair<Fighter>, hp: Pair<number>): string {
	return [
		`Turn ${round - 1} result:`,
		...previous.map(a => `- ${describeAction(a)}`),
		`HP: ${hpLine(fighters, hp)}.`,
		`Turn ${round}. Choose. Reply with ONLY the JSON object.`
	].join('\n')
}

export const buildRetryPrompt = (fighters: Pair<Fighter>): string =>
	`That reply could not be used. Reply with ONLY one JSON object of this shape, with valid moves from each Pokémon's own list: ${answerShape(fighters)}`

/**
 * Reads the LLM answer (it may wrap the JSON in a code fence or add words). Untrusted input: only a move that
 * exists in that fighter's list is accepted, anything else returns null.
 */
export function parseChoices(text: string, fighters: Pair<Fighter>): Pair<string> | null {
	const start = text.indexOf('{')
	const end = text.lastIndexOf('}')
	if (start === -1 || end <= start) return null

	let parsed: unknown
	try { parsed = JSON.parse(text.slice(start, end + 1)) } catch { return null }
	if (typeof parsed !== 'object' || parsed === null) return null

	const choose = (fighter: Fighter): string | null => {
		const value = (parsed as Record<string, unknown>)[fighter.name]
		if (typeof value !== 'string') return null
		const wanted = value.trim().toLowerCase().replace(/[\s_]+/g, '-')
		return fighter.moves.find(m => m.name === wanted)?.name ?? null
	}

	const first = choose(fighters[0])
	const second = choose(fighters[1])
	return first && second ? [first, second] : null
}
