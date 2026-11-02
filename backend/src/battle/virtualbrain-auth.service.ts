import { BadGatewayException, Inject, Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AxiosInstance } from 'axios'
import { VB_HTTP } from './virtualbrain.constants'

/** Subset of ApiKeyTokenResponse in the chatbot OpenAPI spec */
interface TokenResponse {
	accessToken: string
	refreshToken: string
	expiresIn: number
	chatbotId: string
}

interface Tokens {
	accessToken: string
	refreshToken: string
	chatbotId: string
	expiresAt: number
}

// Renew a little before expiry so a request never starts with a token about to die
const SKEW_MS = 60_000

/**
 * The API key is not a bearer token: it is exchanged for a 1h access token and a rotating refresh token.
 * Tokens live in memory only; after a restart the key is exchanged again. Neither the key nor the tokens are ever logged.
 */
@Injectable()
export class VirtualBrainAuthService {
	private tokens?: Tokens
	private renewal?: Promise<Tokens>

	constructor(
		private readonly config: ConfigService,
		@Inject(VB_HTTP) private readonly http: Pick<AxiosInstance, 'post'>
	) {}

	async getSession(): Promise<{ accessToken: string, chatbotId: string }> {
		if (!this.tokens || Date.now() >= this.tokens.expiresAt - SKEW_MS) {
			// Concurrent callers share one renewal: refresh tokens rotate, a second call would burn the first one
			this.renewal ??= this.renew().finally(() => { this.renewal = undefined })
			this.tokens = await this.renewal
		}
		return { accessToken: this.tokens.accessToken, chatbotId: this.tokens.chatbotId }
	}

	/**
	 * Call after an upstream 401: the next getSession() starts again from the API key.
	 * Pass the token that was rejected: a late 401 for a token that has since been replaced must not throw away the new one.
	 */
	invalidate(rejectedToken?: string): void {
		if (rejectedToken === undefined || this.tokens?.accessToken === rejectedToken) this.tokens = undefined
	}

	private async renew(): Promise<Tokens> {
		if (this.tokens) {
			try {
				const { refreshToken, chatbotId } = this.tokens
				return toTokens(await this.post('/v1/auth/api-key/refresh', { refreshToken, chatbotId }))
			} catch { /* refresh token rejected or expired: fall back to the key */ }
		}
		const apiKey = this.config.get<string>('VIRTUALBRAIN_API_TOKEN')
		if (!apiKey) throw new ServiceUnavailableException('Battle service is not configured')
		return toTokens(await this.post('/v1/auth/api-key/token', { apiKey }))
	}

	private async post(path: string, body: object): Promise<TokenResponse> {
		try {
			return (await this.http.post<TokenResponse>(path, body)).data
		} catch {
			throw new BadGatewayException('Battle service authentication failed')
		}
	}
}

const toTokens = (response: TokenResponse): Tokens => ({
	accessToken: response.accessToken,
	refreshToken: response.refreshToken,
	chatbotId: response.chatbotId,
	expiresAt: Date.now() + response.expiresIn * 1000
})
