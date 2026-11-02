import { BadGatewayException, NotFoundException } from '@nestjs/common'
import { Readable } from 'stream'
import type { PokemonService } from '../pokemon/pokemon.service'
import type { PokemonSummary } from '../pokemon/pokemon.types'
import { BattleService } from './battle.service'
import type { VirtualBrainAuthService } from './virtualbrain-auth.service'

const summary = (id: number, name: string): PokemonSummary => ({
	id, name, image: '', types: ['normal'],
	stats: { HP: 1, attack: 1, defense: 1, special_attack: 1, special_defense: 1, speed: 1 }
})

const setup = () => {
	const post = jest.fn()
	const getSession = jest.fn().mockResolvedValue({ accessToken: 'tok', chatbotId: 'bot 1' })
	const invalidate = jest.fn()
	const pokemons = { getSummaries: async () => [summary(1, 'bulbasaur'), summary(2, 'ivysaur')] } as unknown as PokemonService
	const auth = { getSession, invalidate } as unknown as VirtualBrainAuthService
	return { post, getSession, invalidate, service: new BattleService(pokemons, auth, { post }) }
}

const upstream401 = Object.assign(new Error('401'), { response: { status: 401 } })
const upstream401WithBody = (body: Readable) => Object.assign(new Error('401'), { response: { status: 401, data: body } })

describe('BattleService', () => {
	const signal = new AbortController().signal

	it('posts our prompt with the bearer token to the chatbot completion url', async () => {
		const { post, service } = setup()
		const body = Readable.from(['hi'])
		post.mockResolvedValue({ data: body })

		expect(await service.stream([1, 2], signal)).toBe(body)
		const [url, payload, options] = post.mock.calls[0]
		expect(url).toBe('/v1/open-completion/bot%201/query')
		expect(payload.query).toContain('between Bulbasaur and Ivysaur')
		expect(options.headers.Authorization).toBe('Bearer tok')
		expect(options.responseType).toBe('stream')
	})

	it('retries once with a fresh token after a 401', async () => {
		const { post, invalidate, getSession, service } = setup()
		post.mockRejectedValueOnce(upstream401).mockResolvedValueOnce({ data: Readable.from([]) })
		await service.stream([1, 2], signal)
		expect(invalidate).toHaveBeenCalledTimes(1)
		expect(getSession).toHaveBeenCalledTimes(2)
	})

	it('answers 502 when the second attempt is also refused', async () => {
		const { post, service } = setup()
		post.mockRejectedValue(upstream401)
		await expect(service.stream([1, 2], signal)).rejects.toBeInstanceOf(BadGatewayException)
		expect(post).toHaveBeenCalledTimes(2)
	})

	it('answers 404 for an unknown pokemon without calling the chatbot', async () => {
		const { post, service } = setup()
		await expect(service.stream([1, 500], signal)).rejects.toBeInstanceOf(NotFoundException)
		expect(post).not.toHaveBeenCalled()
	})

	it('destroys the body of a failed response, before retrying and before giving up', async () => {
		const { post, service } = setup()
		const bodies = [Readable.from(['first error body']), Readable.from(['second error body'])]
		post.mockRejectedValueOnce(upstream401WithBody(bodies[0])).mockRejectedValueOnce(upstream401WithBody(bodies[1]))

		await expect(service.stream([1, 2], signal)).rejects.toBeInstanceOf(BadGatewayException)
		expect(bodies.map(b => b.destroyed)).toEqual([true, true])
	})

	it('tells the auth service which token was rejected', async () => {
		const { post, invalidate, service } = setup()
		post.mockRejectedValueOnce(upstream401).mockResolvedValueOnce({ data: Readable.from([]) })
		await service.stream([1, 2], signal)
		expect(invalidate).toHaveBeenCalledWith('tok')
	})
})
