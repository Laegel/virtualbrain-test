import { ArrayMaxSize, ArrayMinSize, ArrayUnique, IsArray, IsInt, Max, Min } from 'class-validator'
import { MAX_POKEMON_ID } from '../../common/constants'

export class StartBattleDto {
	/** Exactly two distinct pokemon ids; the prompt is built server side from them */
	@IsArray()
	@ArrayMinSize(2)
	@ArrayMaxSize(2)
	@ArrayUnique()
	@IsInt({ each: true })
	@Min(1, { each: true })
	@Max(MAX_POKEMON_ID, { each: true })
	fighterIds!: number[]
}
