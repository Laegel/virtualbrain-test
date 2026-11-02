import { BadGatewayException, Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { MAX_POKEMON_ID } from '../common/constants'
import { mapLimit } from '../common/map-limit'
import { PokeapiClient } from './pokeapi.client'
import { ApiEvolutionChain, ApiPokemon, ApiSpecies, ApiType, toPokemon, toSummary } from './pokeapi.mapper'
import type { Pokemon, PokemonSummary } from './pokemon.types'

const CONCURRENCY = 12
const summariesCacheFile = () => resolve(process.cwd(), '.cache/summaries.json')

/** What was read from disk is only trusted if it is exactly what we would have written: 898 summaries, ids 1 to 898 in order */
const isSummaries = (value: unknown): value is PokemonSummary[] =>
	Array.isArray(value) && value.length === MAX_POKEMON_ID && value.every((entry, index) =>
		entry?.id === index + 1 && typeof entry.name === 'string' && typeof entry.image === 'string' &&
		Array.isArray(entry.types) && typeof entry.stats === 'object' && entry.stats !== null)

/** The id comes back in the payload and ends up in file names and caches: it must be the one we asked for */
function expectId(payload: ApiPokemon, requested: number): ApiPokemon {
	if (payload.id !== requested) throw new BadGatewayException('Unexpected upstream payload')
	return payload
}

@Injectable()
export class PokemonService implements OnModuleInit {
	private readonly logger = new Logger(PokemonService.name)
	private summaries?: Promise<PokemonSummary[]>
	private readonly pokemons = new Map<number, Promise<Pokemon>>()

	constructor(private readonly pokeapi: PokeapiClient) {}

	/** Warm the grid data in the background so the first page load doesn't wait for 898 calls */
	onModuleInit(): void {
		this.getSummaries().catch(error => this.logger.warn(`Warm-up failed: ${error.message}`))
	}

	getSummaries(): Promise<PokemonSummary[]> {
		if (!this.summaries) {
			this.summaries = this.loadSummaries()
			this.summaries.catch(() => { this.summaries = undefined })
		}
		return this.summaries
	}

	getPokemon(id: number): Promise<Pokemon> {
		let pokemon = this.pokemons.get(id)
		if (!pokemon) {
			pokemon = this.fetchPokemon(id)
			this.pokemons.set(id, pokemon)
			pokemon.catch(() => this.pokemons.delete(id))
		}
		return pokemon
	}

	private async loadSummaries(): Promise<PokemonSummary[]> {
		const cacheFile = summariesCacheFile()
		if (existsSync(cacheFile)) {
			try {
				const cached: unknown = JSON.parse(readFileSync(cacheFile, 'utf8'))
				if (isSummaries(cached)) return cached
				this.logger.warn('Ignoring a summaries cache of the wrong shape')
			} catch {
				this.logger.warn('Ignoring unreadable summaries cache')
			}
		}

		const ids = Array.from({ length: MAX_POKEMON_ID }, (_, i) => i + 1)
		const summaries = await mapLimit(ids, CONCURRENCY, async id =>
			toSummary(expectId(await this.pokeapi.get<ApiPokemon>(`/pokemon/${id}`), id)))

		this.persist(summaries)
		return summaries
	}

	/** The disk cache only saves the next start from 898 requests: failing to write it must never fail a request */
	private persist(summaries: PokemonSummary[]): void {
		try {
			const file = summariesCacheFile()
			mkdirSync(dirname(file), { recursive: true })
			const temporary = `${file}.${process.pid}.tmp`
			writeFileSync(temporary, JSON.stringify(summaries))
			renameSync(temporary, file) // atomic: a crash never leaves a half-written cache behind
		} catch (error) {
			this.logger.warn(`Could not write the summaries cache: ${(error as Error).message}`)
		}
	}

	private async fetchPokemon(id: number): Promise<Pokemon> {
		const pokemon = expectId(await this.pokeapi.get<ApiPokemon>(`/pokemon/${id}`), id)
		const [types, species] = await Promise.all([
			Promise.all([...pokemon.types].sort((a, b) => a.slot - b.slot).map(({ type }) => this.pokeapi.get<ApiType>(type.url))),
			this.pokeapi.get<ApiSpecies>(pokemon.species.url)
		])
		const chain = await this.pokeapi.get<ApiEvolutionChain>(species.evolution_chain.url)
		return toPokemon(pokemon, types, species, chain)
	}
}
