import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
	{ ignores: ['dist', 'pokemons-ru', '.cache'] },
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ['**/*.ts'],
	}
)
