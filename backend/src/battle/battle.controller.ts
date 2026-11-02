import { Body, Controller, GatewayTimeoutException, HttpCode, Inject, Logger, Post, Res } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import type { Response } from 'express'
import { BattleSlots } from './battle-slots'
import { BATTLE_DEADLINES, BattleDeadlines } from './battle.constants'
import { BattleService } from './battle.service'
import { StartBattleDto } from './dto/start-battle.dto'
import { TurnBattleService } from './turn-battle.service'

@Controller('battle')
export class BattleController {
	private readonly logger = new Logger(BattleController.name)

	constructor(
		private readonly battle: BattleService,
		private readonly turnBattle: TurnBattleService,
		private readonly slots: BattleSlots,
		@Inject(BATTLE_DEADLINES) private readonly deadlines: BattleDeadlines
	) {}

	/** Streams the battle as chunked plain text */
	@Post()
	@HttpCode(200)
	@Throttle({ default: { limit: 10, ttl: 60_000 } })
	async fight(@Body() { fighterIds }: StartBattleDto, @Res() res: Response) {
		const { signal } = this.startFight(res, this.deadlines.narratedMs)

		const stream = await this.battle.stream(fighterIds, signal)

		res.set({ 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' })
		// A broken upstream must look like a failed request to the client, not like a short battle
		stream.on('error', () => res.destroy())
		stream.pipe(res)
	}

	/**
	 * Turn-based fight: the LLM picks attacks, the server computes each round.
	 * Streams one JSON event per line (NDJSON): start, round..., end. A failure before the first event is a normal HTTP
	 * error (502, 503...); after that the status is already sent, so a failure comes as a last `error` event.
	 */
	@Post('turn-based')
	@HttpCode(200)
	// A fight is one chatbot call per round, two when its answer has to be retried: up to 24
	@Throttle({ default: { limit: 3, ttl: 60_000 } })
	async fightTurnBased(@Body() { fighterIds }: StartBattleDto, @Res() res: Response) {
		const { signal, clientGone } = this.startFight(res, this.deadlines.turnBasedMs)

		const events = this.turnBattle.play(fighterIds, signal)
		let first: IteratorResult<unknown>
		try {
			first = await events.next()
		} catch (error) {
			if (signal.aborted && !clientGone.aborted) throw new GatewayTimeoutException('The battle took too long')
			throw error
		}

		res.set({ 'Content-Type': 'application/x-ndjson; charset=utf-8', 'Cache-Control': 'no-store', 'X-Accel-Buffering': 'no' })
		res.flushHeaders()
		try {
			if (!first.done) res.write(`${JSON.stringify(first.value)}\n`)
			for await (const event of events) {
				res.write(`${JSON.stringify(event)}\n`)
			}
		} catch (error) {
			if (!clientGone.aborted) {
				this.logger.warn(`Turn-based battle failed: ${(error as Error).message}`)
				res.write(`${JSON.stringify({ type: 'error', message: 'The battle was interrupted' })}\n`)
			}
		}
		res.end()
	}

	/**
	 * Common start of a fight: take a slot (429 if the arena is full), give it back when the response is over, and
	 * build the signal that cancels the upstream work when the client leaves or the deadline passes.
	 */
	private startFight(res: Response, deadlineMs: number) {
		const release = this.slots.acquire()
		const clientGone = new AbortController()
		res.once('close', () => {
			release()
			clientGone.abort()
		})
		return { clientGone: clientGone.signal, signal: AbortSignal.any([clientGone.signal, AbortSignal.timeout(deadlineMs)]) }
	}
}
