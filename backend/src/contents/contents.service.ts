import { Injectable } from '@nestjs/common'
import { mkdir, writeFile } from 'fs/promises'
import { join, resolve } from 'path'
import { MAX_POKEMON_ID } from '../common/constants'
import { mapLimit } from '../common/map-limit'
import { PokemonService } from '../pokemon/pokemon.service'
import { markdownFileName, pokemonToMarkdown } from './pokemon-markdown'

const EXPORT_DIR_NAME = 'pokemons-ru'
const CONCURRENCY = 8

@Injectable()
export class ContentsService {
	private exportRun?: Promise<number>

	constructor(private readonly pokemons: PokemonService) {}

	async markdownFor(id: number): Promise<{ fileName: string, content: string }> {
		const pokemon = await this.pokemons.getPokemon(id)
		return { fileName: markdownFileName(pokemon), content: pokemonToMarkdown(pokemon) }
	}

	/** Writes one file per pokemon into ./pokemons-ru. A second call while one runs joins the first. */
	exportAll(): Promise<{ directory: string, count: number }> {
		this.exportRun ??= this.runExport().finally(() => { this.exportRun = undefined })
		return this.exportRun.then(count => ({ directory: EXPORT_DIR_NAME, count }))
	}

	private async runExport(): Promise<number> {
		const directory = resolve(process.cwd(), EXPORT_DIR_NAME)
		await mkdir(directory, { recursive: true })

		const ids = Array.from({ length: MAX_POKEMON_ID }, (_, i) => i + 1)
		await mapLimit(ids, CONCURRENCY, async id => {
			const { fileName, content } = await this.markdownFor(id)
			await writeFile(join(directory, fileName), content, 'utf8')
		})
		return ids.length
	}
}
