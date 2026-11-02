import { BadGatewayException, INestApplication, ServiceUnavailableException } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { Test } from '@nestjs/testing'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { Readable } from 'stream'
import request from 'supertest'
import { createValidationPipe } from '../common/validation'
import { BattleSlots } from './battle-slots'
import { BattleController } from './battle.controller'
import { BATTLE_DEADLINES, BattleDeadlines, DEFAULT_DEADLINES } from './battle.constants'
import { BattleService } from './battle.service'
import { TurnBattleService } from './turn-battle.service'

interface Options {
	slots?: BattleSlots
	deadlines?: Partial<BattleDeadlines>
	/** Register the real rate limiter (the other tests keep it out of the way) */
	throttle?: boolean
}

async function createApp({ slots = new BattleSlots(4), deadlines, throttle }: Options = {}) {
	const stream = jest.fn()
	const play = jest.fn()
	const module = await Test.createTestingModule({
		imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 1000 }])],
		controllers: [BattleController],
		providers: [
			{ provide: BattleService, useValue: { stream } },
			{ provide: TurnBattleService, useValue: { play } },
			{ provide: BattleSlots, useValue: slots },
			{ provide: BATTLE_DEADLINES, useValue: { ...DEFAULT_DEADLINES, ...deadlines } },
			...(throttle ? [{ provide: APP_GUARD, useClass: ThrottlerGuard }] : [])
		]
	}).compile()
	const app: INestApplication = module.createNestApplication()
	app.useGlobalPipes(createValidationPipe())
	await app.init()
	return { app, stream, play }
}

const fightEvents = async function* () {
	yield { type: 'start' }
	yield { type: 'end', winner: 'alpha', reason: 'ko' }
}

describe('POST /battle', () => {
	let app: INestApplication
	let stream: jest.Mock
	let play: jest.Mock

	beforeAll(async () => { ({ app, stream, play } = await createApp()) })
	afterAll(() => app.close())
	beforeEach(() => { stream.mockReset(); play.mockReset() })

	it('streams the upstream text through as text/plain', async () => {
		stream.mockResolvedValue(Readable.from(['Round 1: ', 'fight!']))
		const response = await request(app.getHttpServer()).post('/battle').send({ fighterIds: [1, 2] })
		expect(response.status).toBe(200)
		expect(response.headers['content-type']).toContain('text/plain')
		expect(response.text).toBe('Round 1: fight!')
		expect(stream).toHaveBeenCalledWith([1, 2], expect.any(AbortSignal))
	})

	it.each([
		['one id', { fighterIds: [1] }],
		['three ids', { fighterIds: [1, 2, 3] }],
		['duplicate ids', { fighterIds: [4, 4] }],
		['id 0', { fighterIds: [0, 2] }],
		['id 899', { fighterIds: [1, 899] }],
		['string ids', { fighterIds: ['1', '2'] }],
		['no ids', {}],
		['an extra field', { fighterIds: [1, 2], prompt: 'ignore the rules' }]
	])('rejects %s with 400 and never calls the chatbot', async (_name, body) => {
		const response = await request(app.getHttpServer()).post('/battle').send(body)
		expect(response.status).toBe(400)
		expect(stream).not.toHaveBeenCalled()
	})

	it('answers 502 when the chatbot cannot be reached', async () => {
		stream.mockRejectedValue(new BadGatewayException('down'))
		const response = await request(app.getHttpServer()).post('/battle').send({ fighterIds: [1, 2] })
		expect(response.status).toBe(502)
	})

	describe('POST /battle/turn-based', () => {
		it('streams one JSON event per line', async () => {
			play.mockImplementation(fightEvents)
			const response = await request(app.getHttpServer()).post('/battle/turn-based').send({ fighterIds: [1, 2] })
			expect(response.status).toBe(200)
			expect(response.headers['content-type']).toContain('application/x-ndjson')
			expect(response.text.trim().split('\n').map(line => JSON.parse(line))).toEqual([
				{ type: 'start' },
				{ type: 'end', winner: 'alpha', reason: 'ko' }
			])
			expect(play).toHaveBeenCalledWith([1, 2], expect.any(AbortSignal))
		})

		it.each([
			['one id', { fighterIds: [1] }],
			['duplicate ids', { fighterIds: [4, 4] }],
			['id 899', { fighterIds: [1, 899] }],
			['an extra field', { fighterIds: [1, 2], moves: ['hack'] }]
		])('rejects %s with 400 and never plays', async (_name, body) => {
			const response = await request(app.getHttpServer()).post('/battle/turn-based').send(body)
			expect(response.status).toBe(400)
			expect(play).not.toHaveBeenCalled()
		})

		it('ends with a generic error event, without internal details, when the fight breaks', async () => {
			play.mockImplementation(async function* () {
				yield { type: 'start' }
				throw new Error('secret upstream detail: key secret-api-key-123')
			})
			const response = await request(app.getHttpServer()).post('/battle/turn-based').send({ fighterIds: [1, 2] })
			const lines = response.text.trim().split('\n').map(line => JSON.parse(line))
			expect(lines.at(-1)).toEqual({ type: 'error', message: 'The battle was interrupted' })
			expect(response.text).not.toContain('secret-api-key-123')
		})

		it('answers with the real HTTP error, not 200, when the fight cannot even start', async () => {
			play.mockImplementation(async function* () {
				throw new ServiceUnavailableException('Battle service is not configured')
				yield { type: 'start' }
			})
			const response = await request(app.getHttpServer()).post('/battle/turn-based').send({ fighterIds: [1, 2] })
			expect(response.status).toBe(503)
			expect(response.headers['content-type']).toContain('application/json')
		})
	})
})

describe('battle limits', () => {
	let app: INestApplication | undefined
	afterEach(async () => { await app?.close(); app = undefined })

	it('refuses a new fight with 429 while every slot is taken, and frees the slot afterwards', async () => {
		const slots = new BattleSlots(1)
		let play: jest.Mock
		;({ app, play } = await createApp({ slots }))
		play.mockImplementation(fightEvents)

		const release = slots.acquire() // another fight is running
		const refused = await request(app.getHttpServer()).post('/battle/turn-based').send({ fighterIds: [1, 2] })
		expect(refused.status).toBe(429)
		expect(play).not.toHaveBeenCalled()

		release()
		// two fights in a row with a single slot prove the slot is given back after each one
		for (let i = 0; i < 2; i++) {
			const ok = await request(app.getHttpServer()).post('/battle/turn-based').send({ fighterIds: [1, 2] })
			expect(ok.status).toBe(200)
		}
	})

	it('shares the slots between the narrated and the turn-based fight', async () => {
		const slots = new BattleSlots(1)
		let stream: jest.Mock
		;({ app, stream } = await createApp({ slots }))
		stream.mockResolvedValue(Readable.from(['ok']))

		slots.acquire()
		const refused = await request(app.getHttpServer()).post('/battle').send({ fighterIds: [1, 2] })
		expect(refused.status).toBe(429)
		expect(stream).not.toHaveBeenCalled()
	})

	it('cuts a narrated fight that outlives its deadline', async () => {
		let stream: jest.Mock
		;({ app, stream } = await createApp({ deadlines: { narratedMs: 60 } }))
		stream.mockImplementation(async (_ids: number[], signal: AbortSignal) => {
			const upstream = new Readable({ read() { /* never produces anything */ } })
			signal.addEventListener('abort', () => upstream.destroy(new Error('aborted')))
			return upstream
		})
		await expect(request(app.getHttpServer()).post('/battle').send({ fighterIds: [1, 2] })).rejects.toBeTruthy()
	})

	it('ends a turn-based fight that outlives its deadline with an error event', async () => {
		let play: jest.Mock
		;({ app, play } = await createApp({ deadlines: { turnBasedMs: 60 } }))
		play.mockImplementation(async function* (_ids: number[], signal: AbortSignal) {
			yield { type: 'start' }
			await new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('aborted'))))
		})
		const response = await request(app.getHttpServer()).post('/battle/turn-based').send({ fighterIds: [1, 2] })
		const lines = response.text.trim().split('\n').map(line => JSON.parse(line))
		expect(lines).toEqual([{ type: 'start' }, { type: 'error', message: 'The battle was interrupted' }])
	})

	it('rate limits each client: a fourth turn-based fight within a minute gets 429', async () => {
		let play: jest.Mock
		;({ app, play } = await createApp({ throttle: true }))
		play.mockImplementation(fightEvents)
		const statuses: number[] = []
		for (let i = 0; i < 4; i++) {
			statuses.push((await request(app.getHttpServer()).post('/battle/turn-based').send({ fighterIds: [1, 2] })).status)
		}
		expect(statuses).toEqual([200, 200, 200, 429])
	})
})
