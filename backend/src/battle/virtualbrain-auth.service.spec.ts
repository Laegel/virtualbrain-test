import { BadGatewayException, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { VirtualBrainAuthService } from './virtualbrain-auth.service'

const tokenResponse = (n: number, expiresIn = 3600) => ({
	data: { accessToken: `access-${n}`, refreshToken: `refresh-${n}`, expiresIn, chatbotId: 'bot-1' }
})

// null = no key configured (undefined would trigger the default)
const setup = (apiKey: string | null = 'test-api-key') => {
	const post = jest.fn()
	const config = { get: () => apiKey ?? undefined } as unknown as ConfigService
	return { post, service: new VirtualBrainAuthService(config, { post }) }
}

describe('VirtualBrainAuthService', () => {
	afterEach(() => jest.useRealTimers())

	it('exchanges the key once and reuses the token while it is valid', async () => {
		const { post, service } = setup()
		post.mockResolvedValue(tokenResponse(1))
		expect(await service.getSession()).toEqual({ accessToken: 'access-1', chatbotId: 'bot-1' })
		await service.getSession()
		expect(post).toHaveBeenCalledTimes(1)
		expect(post).toHaveBeenCalledWith('/v1/auth/api-key/token', { apiKey: 'test-api-key' })
	})

	it('refreshes with the rotated refresh token when within a minute of expiry', async () => {
		jest.useFakeTimers()
		const { post, service } = setup()
		post.mockResolvedValueOnce(tokenResponse(1)).mockResolvedValueOnce(tokenResponse(2))
		await service.getSession()
		jest.advanceTimersByTime(3600_000 - 30_000)
		expect((await service.getSession()).accessToken).toBe('access-2')
		expect(post).toHaveBeenLastCalledWith('/v1/auth/api-key/refresh', { refreshToken: 'refresh-1', chatbotId: 'bot-1' })
	})

	it('falls back to exchanging the key when the refresh is rejected', async () => {
		jest.useFakeTimers()
		const { post, service } = setup()
		post.mockResolvedValueOnce(tokenResponse(1)).mockRejectedValueOnce(new Error('401')).mockResolvedValueOnce(tokenResponse(3))
		await service.getSession()
		jest.advanceTimersByTime(3600_000)
		expect((await service.getSession()).accessToken).toBe('access-3')
		expect(post).toHaveBeenLastCalledWith('/v1/auth/api-key/token', { apiKey: 'test-api-key' })
	})

	it('shares one exchange between concurrent callers', async () => {
		const { post, service } = setup()
		post.mockResolvedValue(tokenResponse(1))
		await Promise.all([service.getSession(), service.getSession(), service.getSession()])
		expect(post).toHaveBeenCalledTimes(1)
	})

	it('answers 503 without calling the API when no key is configured', async () => {
		const { post, service } = setup(null)
		await expect(service.getSession()).rejects.toBeInstanceOf(ServiceUnavailableException)
		expect(post).not.toHaveBeenCalled()
	})

	it('answers 502 when the exchange fails', async () => {
		const { post, service } = setup()
		post.mockRejectedValue(new Error('boom'))
		await expect(service.getSession()).rejects.toBeInstanceOf(BadGatewayException)
	})

	it('starts again from the key after invalidate()', async () => {
		const { post, service } = setup()
		post.mockResolvedValueOnce(tokenResponse(1)).mockResolvedValueOnce(tokenResponse(2))
		await service.getSession()
		service.invalidate()
		expect((await service.getSession()).accessToken).toBe('access-2')
		expect(post).toHaveBeenLastCalledWith('/v1/auth/api-key/token', { apiKey: 'test-api-key' })
	})

	it('ignores a late 401 for a token that has already been replaced', async () => {
		const { post, service } = setup()
		post.mockResolvedValueOnce(tokenResponse(1)).mockResolvedValueOnce(tokenResponse(2))
		await service.getSession() // token 1
		service.invalidate('access-1') // request A got a 401
		expect((await service.getSession()).accessToken).toBe('access-2')
		service.invalidate('access-1') // request B, started with token 1, gets its 401 late
		expect((await service.getSession()).accessToken).toBe('access-2')
		expect(post).toHaveBeenCalledTimes(2)
	})
})
