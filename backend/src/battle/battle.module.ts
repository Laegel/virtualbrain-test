import { Module } from '@nestjs/common'
import { createUpstreamClient } from '../common/http'
import { PokemonModule } from '../pokemon/pokemon.module'
import { BattleSlots } from './battle-slots'
import { BattleController } from './battle.controller'
import { BATTLE_DEADLINES, DEFAULT_DEADLINES, MAX_CONCURRENT_BATTLES } from './battle.constants'
import { BattleService } from './battle.service'
import { RNG, TurnBattleService } from './turn-battle.service'
import { VB_API_URL, VB_HTTP } from './virtualbrain.constants'
import { VirtualBrainAuthService } from './virtualbrain-auth.service'

@Module({
	imports: [PokemonModule],
	controllers: [BattleController],
	providers: [
		// Idle timeout, not a total one: tokens keep arriving on a healthy stream, a hung upstream gets cut
		{ provide: VB_HTTP, useFactory: () => createUpstreamClient({ baseURL: VB_API_URL, timeout: 60_000 }) },
		{ provide: BattleSlots, useFactory: () => new BattleSlots(MAX_CONCURRENT_BATTLES) },
		{ provide: BATTLE_DEADLINES, useValue: DEFAULT_DEADLINES },
		VirtualBrainAuthService,
		BattleService,
		TurnBattleService,
		{ provide: RNG, useValue: Math.random }
	]
})
export class BattleModule {}
