import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common'
import { Readable } from 'stream'
import type { MovesService } from '../pokemon/moves.service'
import type { PokemonService } from '../pokemon/pokemon.service'
import type { Move } from '../pokemon/pokemon.types'
import type { BattleService } from './battle.service'
import { MAX_ROUNDS, TurnBattleService } from './turn-battle.service'
import type { TurnEvent } from './turn-battle.types'

type RoundEvent = Extract<TurnEvent, { type: 'round' }>
const roundsOf = (events: TurnEvent[]) => events.filter((e): e is RoundEvent => e.type === 'round')

const FENCED = '```json\n{"alpha":"flame-wheel","beta":"vine-whip"}\n```'
const move = (name: string, type: string, power: number): Move => ({ name, type, power, accuracy: 100, category: 'physical' })

/**
 * alpha (fire, speed 100) hits beta (grass) for 130 per round at rng 0.5; beta only scratches back for about 24.
 * With beta base HP 200 (275 max) the fight lasts 3 rounds; with 20 (95 max) it ends in round 1.
 */
const setup = (betaBaseHp = 200, alphaBaseHp = 50, onLoad?: () => Promise<void>) => {
	const stats = { attack: 100, defense: 50, special_attack: 50, special_defense: 50 }
	const pokemons = {
		getPokemon: async (id: number) => (await onLoad?.(), id === 1)
			? { name: 'alpha', image: '', apiTypes: [{ name: 'fire' }], stats: { HP: alphaBaseHp, speed: 100, ...stats }, apiResistances: [{ name: 'grass', damage_multiplier: 0.5 }] }
			: { name: 'beta', image: '', apiTypes: [{ name: 'grass' }], stats: { HP: betaBaseHp, speed: 10, ...stats }, apiResistances: [{ name: 'fire', damage_multiplier: 2 }] }
	} as unknown as PokemonService
	const moves = {
		getMoveset: async (id: number) => id === 1 ? [move('flame-wheel', 'fire', 60)] : [move('vine-whip', 'grass', 45)]
	} as unknown as MovesService

	const streams: Readable[] = []
	const open = jest.fn()
	const reply = (text: string, sessionId: string | undefined = 'sess-1') => {
		const stream = Readable.from([text])
		streams.push(stream)
		return { stream, sessionId }
	}
	const assertReady = jest.fn().mockResolvedValue(undefined)
	const service = new TurnBattleService(pokemons, moves, { open, assertReady } as unknown as BattleService, () => 0.5)
	const events: TurnEvent[] = []
	const play = async (signal: AbortSignal = new AbortController().signal) => {
		events.length = 0
		for await (const event of service.play([1, 2], signal)) events.push(event)
		return [...events]
	}
	return { open, assertReady, reply, streams, play, events }
}

describe('TurnBattleService', () => {
	it('plays to a KO and keeps every call after the first in the same session', async () => {
		const { open, reply, play } = setup()
		open.mockImplementation(async () => reply(FENCED))

		const events = await play()

		expect(events.map(e => e.type)).toEqual(['start', 'round', 'round', 'round', 'end'])
		expect(events.at(-1)).toEqual({ type: 'end', winner: 'alpha', reason: 'ko' })
		const rounds = roundsOf(events)
		expect(rounds.every(r => r.source === 'llm')).toBe(true)
		expect(rounds[0].actions.map(a => a.fighter)).toEqual(['alpha', 'beta'])
		expect(rounds[rounds.length - 1].hp[1]).toBe(0)

		const sessionIds = open.mock.calls.map(call => call[2])
		expect(sessionIds).toEqual([undefined, 'sess-1', 'sess-1'])
		expect(open.mock.calls[1][0]).toContain('Turn 1 result:')
		expect(open.mock.calls[0][0]).toContain('{"alpha":"<move>","beta":"<move>"}')
	})

	it('retries once in the same session when the first answer is unusable', async () => {
		const { open, reply, play } = setup(20)
		open.mockResolvedValueOnce(reply('I would pick flame wheel')).mockResolvedValueOnce(reply(FENCED))

		const events = await play()

		expect(open).toHaveBeenCalledTimes(2)
		expect(open.mock.calls[1][0]).toContain('could not be used')
		expect(open.mock.calls[1][2]).toBe('sess-1')
		expect(events.find(e => e.type === 'round')).toMatchObject({ source: 'llm' })
	})

	it('plays the best attacks itself when the LLM never answers in the right format', async () => {
		const { open, reply, play } = setup(20)
		open.mockImplementation(async () => reply('blah blah'))

		const events = await play()

		expect(events.find(e => e.type === 'round')).toMatchObject({ source: 'fallback' })
		expect(events.at(-1)).toEqual({ type: 'end', winner: 'alpha', reason: 'ko' })
	})

	it('only ever plays moves from the fighters own list, whatever the LLM says', async () => {
		const { open, reply, play } = setup(20)
		open.mockImplementation(async () => reply('{"alpha":"self-destruct","beta":"flame-wheel"}'))

		const events = await play()

		const actions = roundsOf(events).flatMap(r => r.actions)
		expect(actions.map(a => a.move)).toEqual(['flame-wheel']) // fallback picked alpha's own move; beta fainted before acting
		expect(events.find(e => e.type === 'round')).toMatchObject({ source: 'fallback' })
	})

	it('stops after the round limit and names the fighter in better shape', async () => {
		const { open, reply, play } = setup(5000, 5000)
		open.mockImplementation(async () => reply(FENCED))

		const events = await play()

		expect(roundsOf(events)).toHaveLength(MAX_ROUNDS)
		expect(events.at(-1)).toEqual({ type: 'end', winner: 'alpha', reason: 'round-limit' })
	})

	it('stops reading an over-long reply as soon as it is too long', async () => {
		const { open, streams, play } = setup(20)
		// An endless producer: without a cut-off this loop would never finish
		open.mockImplementation(async () => {
			const endless = new Readable({ read() { this.push('x'.repeat(1500)) } })
			streams.push(endless)
			return { stream: endless, sessionId: 'sess-1' }
		})

		await play()

		expect(streams.length).toBeGreaterThan(0)
		expect(streams.every(s => s.destroyed)).toBe(true)
	})
	it('lets an upstream failure through to the caller', async () => {
		const { open, play } = setup()
		open.mockRejectedValue(new BadGatewayException('down'))
		await expect(play()).rejects.toBeInstanceOf(BadGatewayException)
	})

	it('checks the chatbot is usable before it announces the fight', async () => {
		const { assertReady, open, play, events } = setup()
		assertReady.mockRejectedValue(new ServiceUnavailableException('Battle service is not configured'))

		await expect(play()).rejects.toBeInstanceOf(ServiceUnavailableException)
		expect(events).toEqual([]) // not even a `start` event: the caller can still answer with a real HTTP status
		expect(open).not.toHaveBeenCalled()
	})

	it('fails clearly when the chatbot gives no session id, instead of playing on without memory', async () => {
		const { open, play } = setup()
		open.mockResolvedValue({ stream: Readable.from([FENCED]), sessionId: undefined })

		await expect(play()).rejects.toBeInstanceOf(BadGatewayException)
		expect(open).toHaveBeenCalledTimes(1)
	})

	it('does not authenticate or call the chatbot for a client that left while the fighters were loading', async () => {
		const controller = new AbortController()
		const { open, assertReady, play } = setup(200, 50, async () => { controller.abort() })

		await expect(play(controller.signal)).rejects.toThrow()
		expect(assertReady).not.toHaveBeenCalled()
		expect(open).not.toHaveBeenCalled()
	})
})
