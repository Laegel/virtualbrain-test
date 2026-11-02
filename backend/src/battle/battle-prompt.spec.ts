import type { PokemonSummary } from '../pokemon/pokemon.types'
import { buildBattlePrompt } from './battle-prompt'

const pokemon = (name: string, types: string[], HP: number): PokemonSummary => ({
	id: 1, name, image: '', types,
	stats: { HP, attack: 2, defense: 3, special_attack: 4, special_defense: 5, speed: 6 }
})

describe('buildBattlePrompt', () => {
	const prompt = buildBattlePrompt(pokemon('mr-mime', ['psychic', 'fairy'], 40), pokemon('corviknight', ['flying', 'steel'], 98))

	it('names both fighters in title case with their types and stats', () => {
		expect(prompt).toContain('between Mr Mime and Corviknight')
		expect(prompt).toContain('- Mr Mime: psychic/fairy type, HP 40, Attack 2, Defense 3, Speed 6')
		expect(prompt).toContain('- Corviknight: flying/steel type, HP 98')
	})

	it('asks for plain text and a final Winner line', () => {
		expect(prompt).toContain('no markdown')
		expect(prompt).toContain('"Winner: <name>"')
	})

	it('makes the provided data authoritative and forbids talking about missing documents', () => {
		// Retrieval can miss one of the two Pokémon: the model must then narrate from the data in the prompt
		expect(prompt).toContain('authoritative')
		expect(prompt).toContain('never mention missing documents')
	})
})
