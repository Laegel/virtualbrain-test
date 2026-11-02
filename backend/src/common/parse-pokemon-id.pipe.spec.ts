import { BadRequestException } from '@nestjs/common'
import { ParsePokemonIdPipe } from './parse-pokemon-id.pipe'

const pipe = new ParsePokemonIdPipe()

describe('ParsePokemonIdPipe', () => {
	it.each(['1', '898'])('accepts %s', value => {
		expect(pipe.transform(value)).toBe(Number(value))
	})

	it.each(['0', '899', '-1', '1e2', '0x10', '../etc/passwd', 'all', '', ' 1', '1.5'])('rejects %j', value => {
		expect(() => pipe.transform(value)).toThrow(BadRequestException)
	})
})
