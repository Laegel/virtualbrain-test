import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common'
import { MAX_POKEMON_ID } from './constants'

/** Accepts only plain decimal ids in [1, MAX_POKEMON_ID]: no signs, no "1e2", no "0x10", no path fragments. */
@Injectable()
export class ParsePokemonIdPipe implements PipeTransform<string, number> {
	transform(value: string): number {
		const id = /^\d{1,4}$/.test(value) ? Number(value) : NaN
		if (!(id >= 1 && id <= MAX_POKEMON_ID)) {
			throw new BadRequestException(`Pokemon id must be an integer between 1 and ${MAX_POKEMON_ID}`)
		}
		return id
	}
}
