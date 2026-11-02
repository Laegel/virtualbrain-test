import { Injectable } from '@nestjs/common'
import { mapLimit } from '../common/map-limit'
import { latestLevelUpMoves, pickMoveset } from './moveset'
import { PokeapiClient } from './pokeapi.client'
import { ApiMove, ApiPokemon, statBlock, typeNames } from './pokeapi.mapper'
import type { Move } from './pokemon.types'

const CONCURRENCY = 12

@Injectable()
export class MovesService {
	private readonly movesets = new Map<number, Promise<Move[]>>()

	constructor(private readonly pokeapi: PokeapiClient) {}

	getMoveset(id: number): Promise<Move[]> {
		let moveset = this.movesets.get(id)
		if (!moveset) {
			moveset = this.loadMoveset(id)
			this.movesets.set(id, moveset)
			moveset.catch(() => this.movesets.delete(id))
		}
		return moveset
	}

	private async loadMoveset(id: number): Promise<Move[]> {
		const pokemon = await this.pokeapi.get<ApiPokemon>(`/pokemon/${id}`)
		const moves = await mapLimit(latestLevelUpMoves(pokemon), CONCURRENCY, ({ url }) => this.pokeapi.get<ApiMove>(url))
		return pickMoveset(moves, typeNames(pokemon), statBlock(pokemon))
	}
}
