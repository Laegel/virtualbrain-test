import { Controller, Get, Param } from '@nestjs/common'
import { ParsePokemonIdPipe } from '../common/parse-pokemon-id.pipe'
import { PokemonService } from './pokemon.service'

@Controller('pokemons')
export class PokemonController {
	constructor(private readonly pokemons: PokemonService) {}

	@Get()
	async list() {
		return { pokemons: await this.pokemons.getSummaries() }
	}

	@Get(':id')
	async get(@Param('id', ParsePokemonIdPipe) id: number) {
		return { pokemon: await this.pokemons.getPokemon(id) }
	}
}
