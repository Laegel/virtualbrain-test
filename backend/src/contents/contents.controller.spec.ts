import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'
import { ContentsController } from './contents.controller'
import { ContentsService } from './contents.service'

describe('GET /contents/all', () => {
	let app: INestApplication
	const exportAll = jest.fn()

	beforeAll(async () => {
		const module = await Test.createTestingModule({
			controllers: [ContentsController],
			providers: [{ provide: ContentsService, useValue: { exportAll, markdownFor: jest.fn() } }]
		}).compile()
		app = module.createNestApplication()
		await app.init()
	})
	afterAll(() => app.close())
	beforeEach(() => exportAll.mockReset().mockResolvedValue({ directory: 'pokemons-ru', count: 898 }))

	it.each(['get', 'head'] as const)('refuses a cross-site %s without writing anything', async method => {
		const response = await request(app.getHttpServer())[method]('/contents/all').set('Sec-Fetch-Site', 'cross-site')
		expect(response.status).toBe(403)
		expect(exportAll).not.toHaveBeenCalled()
	})

	it.each(['same-origin', 'same-site', 'none'])('allows Sec-Fetch-Site: %s', async site => {
		const response = await request(app.getHttpServer()).get('/contents/all').set('Sec-Fetch-Site', site)
		expect(response.status).toBe(200)
		expect(exportAll).toHaveBeenCalledTimes(1)
	})

	it('allows a client that sends no fetch metadata (curl, scripts)', async () => {
		const response = await request(app.getHttpServer()).get('/contents/all')
		expect(response.status).toBe(200)
	})
})
