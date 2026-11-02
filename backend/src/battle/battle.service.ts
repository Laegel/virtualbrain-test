import { BadGatewayException, Inject, Injectable, NotFoundException } from '@nestjs/common'
import type { AxiosInstance } from 'axios'
import type { Readable } from 'stream'
import { PokemonService } from '../pokemon/pokemon.service'
import { buildBattlePrompt } from './battle-prompt'
import { VB_HTTP } from './virtualbrain.constants'
import { VirtualBrainAuthService } from './virtualbrain-auth.service'

@Injectable()
export class BattleService {
	constructor(
		private readonly pokemons: PokemonService,
		private readonly auth: VirtualBrainAuthService,
		@Inject(VB_HTTP) private readonly http: Pick<AxiosInstance, 'post'>
	) {}

	/** Opens the chatbot completion stream (chunked text/plain) for a one-shot fight between two pokemon */
	async stream([firstId, secondId]: number[], signal: AbortSignal): Promise<Readable> {
		const summaries = await this.pokemons.getSummaries()
		const first = summaries.find(p => p.id === firstId)
		const second = summaries.find(p => p.id === secondId)
		if (!first || !second) throw new NotFoundException('Pokemon not found')

		return (await this.open(buildBattlePrompt(first, second), signal)).stream
	}

	/** Fails with the right HTTP error (503 without an API key, 502 if the login fails) before a fight is announced */
	async assertReady(): Promise<void> {
		await this.auth.getSession()
	}

	/**
	 * Sends one query to the chatbot. Without `sessionId` a new session is created; passing the returned one back
	 * continues the same conversation (the turn-based battle relies on this).
	 */
	async open(query: string, signal: AbortSignal, sessionId?: string): Promise<{ stream: Readable, sessionId?: string }> {
		// One retry: an expired or revoked access token shows up as a 401 only when used
		for (let attempt = 0; ; attempt++) {
			signal.throwIfAborted() // a client that has left must not cost an authentication or a completion
			const { accessToken, chatbotId } = await this.auth.getSession()
			try {
				const response = await this.http.post<Readable>(
					`/v1/open-completion/${encodeURIComponent(chatbotId)}/query`,
					{ query },
					{
						headers: { Authorization: `Bearer ${accessToken}`, ...(sessionId && { 'x-session-id': sessionId }) },
						responseType: 'stream',
						signal
					}
				)
				const header = response.headers?.['x-session-id']
				return { stream: response.data, sessionId: typeof header === 'string' ? header : undefined }
			} catch (error) {
				// With responseType 'stream' even an error response has an unread body: close it or it holds the socket
				const failed = (error as { response?: { status?: number, data?: { destroy?: () => void } } }).response
				failed?.data?.destroy?.()
				if (failed?.status === 401 && attempt === 0) {
					this.auth.invalidate(accessToken)
					continue
				}
				throw new BadGatewayException('Battle service is unavailable')
			}
		}
	}
}
