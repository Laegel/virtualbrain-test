import { createServer, type Server } from 'http'
import type { AddressInfo } from 'net'
import { createUpstreamClient } from './http'

const listen = (server: Server): Promise<number> =>
	new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port)))

describe('createUpstreamClient', () => {
	const servers: Server[] = []
	afterEach(() => Promise.all(servers.splice(0).map(s => new Promise(resolve => s.close(resolve)))))

	it('does not follow redirects, so a credential never reaches a host it was not meant for', async () => {
		let leaked = ''
		const elsewhere = createServer((req, res) => { req.on('data', c => { leaked += c }).on('end', () => res.end('ok')) })
		servers.push(elsewhere)
		const elsewherePort = await listen(elsewhere)

		const origin = createServer((_req, res) => {
			res.writeHead(307, { Location: `http://127.0.0.1:${elsewherePort}/collect` })
			res.end()
		})
		servers.push(origin)
		const client = createUpstreamClient({ baseURL: `http://127.0.0.1:${await listen(origin)}` })

		await expect(client.post('/token', { apiKey: 'secret-api-key' })).rejects.toBeTruthy()
		expect(leaked).toBe('')
	})
})
