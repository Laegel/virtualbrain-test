import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

const apiPokemon = (id: number | string) => ({
	id, name: `pokemon-${id}`,
	sprites: { front_default: null, other: { 'official-artwork': { front_default: `https://img.test/${id}.png` } } },
	stats: [{ base_stat: 50, stat: { name: 'hp', url: '' } }],
	types: [{ slot: 1, type: { name: 'normal', url: 'https://pokeapi.co/api/v2/type/1/' } }],
	abilities: [], moves: [],
	species: { name: 'x', url: 'https://pokeapi.co/api/v2/pokemon-species/1/' }
})

const idOf = (url: string) => Number(url.split('/').pop())

// Compared by status, not by class: resetModules gives each test its own copy of Nest, so `instanceof` can never match
const badGateway = { response: { statusCode: 502 } }

describe('PokemonService', () => {
	const realCwd = process.cwd()
	let dir: string

	// The disk cache lives under the working directory: run every test in a scratch one, never in the real backend folder
	beforeEach(() => {
		dir = mkdtempSync(join(tmpdir(), 'pokemon-service-'))
		process.chdir(dir)
		jest.resetModules()
	})
	afterEach(() => {
		process.chdir(realCwd)
		rmSync(dir, { recursive: true, force: true })
	})

	const create = async (get: jest.Mock) => {
		const { PokemonService } = await import('./pokemon.service')
		return new PokemonService({ get } as never)
	}

	it('rejects a payload whose id is not the one requested', async () => {
		const service = await create(jest.fn(async () => apiPokemon('../escaped')))
		await expect(service.getPokemon(1)).rejects.toMatchObject(badGateway)
	})

	it('rejects a summary payload whose id is not the one requested', async () => {
		const get = jest.fn(async (url: string) => apiPokemon(idOf(url) === 7 ? '../escaped' : idOf(url)))
		const service = await create(get)
		await expect(service.getSummaries()).rejects.toMatchObject(badGateway)
	})

	it('keeps serving the summaries when the disk cache cannot be written', async () => {
		writeFileSync(join(dir, '.cache'), 'a file where the cache folder should be')
		const service = await create(jest.fn(async (url: string) => apiPokemon(idOf(url))))
		await expect(service.getSummaries()).resolves.toHaveLength(898)
	})

	it('reuses the cache written by a previous run and ignores a corrupt one', async () => {
		const get = jest.fn(async (url: string) => apiPokemon(idOf(url)))
		await (await create(get)).getSummaries()
		expect(get).toHaveBeenCalledTimes(898)

		get.mockClear()
		jest.resetModules()
		await (await create(get)).getSummaries()
		expect(get).not.toHaveBeenCalled()

		writeFileSync(join(dir, '.cache', 'summaries.json'), '{ not json')
		jest.resetModules()
		await expect((await create(get)).getSummaries()).resolves.toHaveLength(898)
		expect(get).toHaveBeenCalledTimes(898)
	})

	it.each([
		['an object that only has a length of 898', { length: 898, unexpected: 'not a list' }],
		['a list of 898 entries of the wrong shape', Array.from({ length: 898 }, () => ({})) ],
		['a list whose ids are out of order', Array.from({ length: 898 }, (_, i) => ({ id: 898 - i, name: 'x', image: '', types: [], stats: {} }))]
	])('ignores a cache holding %s and fetches again', async (_name, content) => {
		mkdirSync(join(dir, '.cache'))
		writeFileSync(join(dir, '.cache', 'summaries.json'), JSON.stringify(content))
		const get = jest.fn(async (url: string) => apiPokemon(idOf(url)))

		const summaries = await (await create(get)).getSummaries()

		expect(get).toHaveBeenCalledTimes(898)
		expect(summaries[0]).toMatchObject({ id: 1, name: 'pokemon-1' })
	})
})
