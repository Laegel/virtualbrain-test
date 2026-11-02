import { Module } from '@nestjs/common'
import { PokemonModule } from '../pokemon/pokemon.module'
import { ContentsController } from './contents.controller'
import { ContentsService } from './contents.service'

@Module({
	imports: [PokemonModule],
	controllers: [ContentsController],
	providers: [ContentsService]
})
export class ContentsModule {}
