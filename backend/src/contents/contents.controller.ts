import { Controller, Get, Header, Param, Res, UseGuards } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Response } from 'express'
import { RejectCrossSiteGuard } from '../common/cross-site.guard'
import { ParsePokemonIdPipe } from '../common/parse-pokemon-id.pipe'
import { ContentsService } from './contents.service'

@Controller('contents')
export class ContentsController {
	constructor(private readonly contents: ContentsService) {}

	/** Declared before `:pokemonId` so "all" is never parsed as an id */
	@Get('all')
	@UseGuards(RejectCrossSiteGuard) // a GET that writes files: another site must not be able to make a browser fire it
	@Throttle({ default: { limit: 2, ttl: 60_000 } })
	exportAll() {
		return this.contents.exportAll()
	}

	@Get(':pokemonId')
	@Header('Content-Type', 'text/markdown; charset=utf-8')
	async download(@Param('pokemonId', ParsePokemonIdPipe) id: number, @Res() res: Response) {
		const { fileName, content } = await this.contents.markdownFor(id)
		res.attachment(fileName).send(content)
	}
}
