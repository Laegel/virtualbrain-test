import { mkdtempSync, readdirSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import type { PokemonService } from '../pokemon/pokemon.service'
import type { Pokemon } from '../pokemon/pokemon.types'
import { ContentsService } from './contents.service'

const pokemon = (id: number): Pokemon => ({
	id, pokedexId: id, name: `pokemon-${id}`, image: '', sprite: '', slug: `pokemon-${id}`,
	stats: { HP: 1, attack: 1, defense: 1, special_attack: 1, special_defense: 1, speed: 1 },
	apiTypes: [{ name: 'normal', image: '' }], apiGeneration: 1, apiResistances: [],
	resistanceModifyingAbilitiesForApi: { name: '', slug: '' }, apiEvolutions: [], apiPreEvolution: 'none',
	apiResistancesWithAbilities: [], abilities: []
})

describe('ContentsService', () => {
	const realCwd = process.cwd()
	let dir: string
	beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'contents-service-')); process.chdir(dir) })
	afterEach(() => { process.chdir(realCwd); rmSync(dir, { recursive: true, force: true }) })

	const create = (getPokemon: jest.Mock) => new ContentsService({ getPokemon } as unknown as PokemonService)

	it('writes one file per pokemon, named from its id and slug', async () => {
		const service = create(jest.fn(async (id: number) => pokemon(id)))
		await expect(service.exportAll()).resolves.toEqual({ directory: 'pokemons-ru', count: 898 })
		const files = readdirSync(join(dir, 'pokemons-ru'))
		expect(files).toHaveLength(898)
		expect(files).toContain('001-pokemon-1.md')
		expect(files).toContain('898-pokemon-898.md')
	})

	it('shares one run between simultaneous exports', async () => {
		const getPokemon = jest.fn(async (id: number) => pokemon(id))
		const service = create(getPokemon)
		await Promise.all([service.exportAll(), service.exportAll()])
		expect(getPokemon).toHaveBeenCalledTimes(898)
	})

	it('can be retried after a failure, and only once the failed run has fully stopped', async () => {
		let running = 0
		let peak = 0
		const getPokemon = jest.fn(async (id: number) => {
			running++
			peak = Math.max(peak, running)
			await new Promise(r => setTimeout(r, 2))
			running--
			if (id === 3) throw new Error('upstream down')
			return pokemon(id)
		})
		const service = create(getPokemon)

		const failing = service.exportAll()
		await expect(failing).rejects.toThrow('upstream down')
		expect(running).toBe(0) // nothing from the failed run is still working when it reports failure
		expect(peak).toBeLessThanOrEqual(8)

		getPokemon.mockImplementation(async (id: number) => pokemon(id))
		await expect(service.exportAll()).resolves.toMatchObject({ count: 898 })
	})
})
