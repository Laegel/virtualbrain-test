import { Controller, Get, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { BattleModule } from './battle/battle.module'
import { ContentsModule } from './contents/contents.module'
import { PokemonModule } from './pokemon/pokemon.module'

@Controller()
class HealthController {
	@Get('ping')
	ping() {
		return 'pong'
	}
}

@Module({
	imports: [
		ConfigModule.forRoot({ isGlobal: true }),
		ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
		PokemonModule,
		ContentsModule,
		BattleModule
	],
	controllers: [HealthController],
	providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }]
})
export class AppModule {}
