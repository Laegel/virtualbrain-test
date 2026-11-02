import { Module } from '@nestjs/common'
import { MovesService } from './moves.service'
import { PokeapiClient } from './pokeapi.client'
import { PokemonController } from './pokemon.controller'
import { PokemonService } from './pokemon.service'

@Module({
	controllers: [PokemonController],
	providers: [PokeapiClient, PokemonService, MovesService],
	exports: [PokemonService, MovesService]
})
export class PokemonModule {}
