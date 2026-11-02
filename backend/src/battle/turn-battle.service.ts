import { BadGatewayException, Inject, Injectable } from '@nestjs/common'
import { PokemonService } from '../pokemon/pokemon.service'
import { MovesService } from '../pokemon/moves.service'
import { BattleService } from './battle.service'
import { buildRetryPrompt, buildRoundPrompt, buildSetupPrompt, parseChoices } from './turn-battle-prompt'
import type { PublicFighter, TurnEvent } from './turn-battle.types'
import { bestMove, Fighter, maxHpOf, Pair, resolveRound, Rng, winnerByHealth } from './turn-engine'

export const RNG = Symbol('RNG')

/** Cap on rounds (cost and time: each round is one LLM call of ~6-8 s) */
export const MAX_ROUNDS = 12
/** A move choice is a tiny JSON object: anything much longer is not one */
const MAX_REPLY_CHARS = 2000

type Source = 'llm' | 'fallback'

@Injectable()
export class TurnBattleService {
	constructor(
		private readonly pokemons: PokemonService,
		private readonly moves: MovesService,
		private readonly chatbot: BattleService,
		@Inject(RNG) private readonly rng: Rng
	) {}

	/**
	 * The LLM only picks the attacks; this service computes every result and sends it back in the same chatbot
	 * session. Yields one event per step so the browser can play the fight round by round.
	 */
	async *play(fighterIds: number[], signal: AbortSignal): AsyncGenerator<TurnEvent> {
		const fighters = await Promise.all(fighterIds.map(id => this.loadFighter(id))) as Pair<Fighter>
		signal.throwIfAborted()
		// Before the first event: the caller can still answer with a real HTTP error (503 without an API key)
		await this.chatbot.assertReady()
		let hp: Pair<number> = [fighters[0].maxHp, fighters[1].maxHp]
		yield { type: 'start', fighters: [toPublic(fighters[0]), toPublic(fighters[1])] }

		let query = buildSetupPrompt(fighters, hp)
		let sessionId: string | undefined
		for (let round = 1; round <= MAX_ROUNDS; round++) {
			const choice = await this.chooseMoves(query, fighters, signal, sessionId)
			sessionId = choice.sessionId

			const result = resolveRound(fighters, hp, choice.moves, this.rng)
			hp = result.hp
			yield { type: 'round', round, actions: result.actions, hp, source: choice.source }

			const loser = hp.findIndex(h => h === 0)
			if (loser !== -1) {
				yield { type: 'end', winner: fighters[loser === 0 ? 1 : 0].name, reason: 'ko' }
				return
			}
			query = buildRoundPrompt(round + 1, result.actions, fighters, hp)
		}
		yield { type: 'end', winner: winnerByHealth(fighters, hp).name, reason: 'round-limit' }
	}

	private async chooseMoves(query: string, fighters: Pair<Fighter>, signal: AbortSignal, sessionId?: string) {
		let reply = await this.ask(query, signal, sessionId)
		let moves = parseChoices(reply.text, fighters)
		if (!moves) {
			reply = await this.ask(buildRetryPrompt(fighters), signal, reply.sessionId)
			moves = parseChoices(reply.text, fighters)
		}
		if (moves) return { moves, sessionId: reply.sessionId, source: 'llm' as Source }

		// The LLM keeps ignoring the format: play the best attacks so the fight still ends
		const fallback: Pair<string> = [bestMove(fighters[0], fighters[1]).name, bestMove(fighters[1], fighters[0]).name]
		return { moves: fallback, sessionId: reply.sessionId, source: 'fallback' as Source }
	}

	private async ask(query: string, signal: AbortSignal, sessionId?: string) {
		signal.throwIfAborted()
		const { stream, sessionId: newSessionId } = await this.chatbot.open(query, signal, sessionId)
		const session = newSessionId ?? sessionId
		if (!session) {
			// Without a session every later prompt would reach a chatbot that never saw the rules or the move lists
			stream.destroy()
			throw new BadGatewayException('The chatbot gave no session id')
		}
		stream.setEncoding('utf8')
		let text = ''
		for await (const chunk of stream) {
			text += chunk
			if (text.length > MAX_REPLY_CHARS) { stream.destroy(); break }
		}
		return { text, sessionId: session }
	}

	private async loadFighter(id: number): Promise<Fighter> {
		const [pokemon, moves] = await Promise.all([this.pokemons.getPokemon(id), this.moves.getMoveset(id)])
		return {
			id,
			name: pokemon.name,
			image: pokemon.image,
			types: pokemon.apiTypes.map(t => t.name),
			stats: pokemon.stats,
			maxHp: maxHpOf(pokemon.stats.HP),
			moves,
			takes: Object.fromEntries(pokemon.apiResistances.map(r => [r.name, r.damage_multiplier]))
		}
	}
}

const toPublic = ({ id, name, image, types, maxHp, moves }: Fighter): PublicFighter => ({ id, name, image, types, maxHp, moves })
