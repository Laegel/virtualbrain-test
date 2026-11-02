import { BadGatewayException } from '@nestjs/common'
import { PokeapiClient } from './pokeapi.client'

describe('PokeapiClient', () => {
	it('refuses urls outside PokeAPI', () => {
		const client = new PokeapiClient()
		expect(() => client.get('http://169.254.169.254/latest/meta-data')).toThrow(BadGatewayException)
		expect(() => client.get('https://pokeapi.co.evil.test/api/v2/pokemon/1')).toThrow(BadGatewayException)
	})
})
