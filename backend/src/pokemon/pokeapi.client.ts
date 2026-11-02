import { BadGatewayException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import type { AxiosError } from 'axios'
import { POKEAPI_URL } from '../common/constants'
import { createUpstreamClient } from '../common/http'

const RETRIES = 2

/**
 * Thin PokeAPI client. PokeAPI asks clients to cache: every GET is memoised for the process lifetime
 * (the data is static), concurrent calls for the same url share one request.
 */
@Injectable()
export class PokeapiClient {
	private readonly logger = new Logger(PokeapiClient.name)
	private readonly http = createUpstreamClient({ timeout: 10_000 })
	private readonly cache = new Map<string, Promise<unknown>>()

	/** `urlOrPath` is either "/pokemon/1" or a full url taken from a previous PokeAPI payload */
	get<T>(urlOrPath: string): Promise<T> {
		const url = urlOrPath.startsWith('/') ? POKEAPI_URL + urlOrPath : urlOrPath

		// Follow-up urls come from a response body: never let them point anywhere else (SSRF)
		if (!url.startsWith(`${POKEAPI_URL}/`)) {
			throw new BadGatewayException('Unexpected upstream url')
		}

		let request = this.cache.get(url) as Promise<T> | undefined
		if (!request) {
			request = this.fetch<T>(url)
			this.cache.set(url, request)
			// Don't cache failures
			request.catch(() => this.cache.delete(url))
		}
		return request
	}

	private async fetch<T>(url: string): Promise<T> {
		for (let attempt = 0; ; attempt++) {
			try {
				return (await this.http.get<T>(url)).data
			} catch (error) {
				const status = (error as AxiosError).response?.status
				if (status === 404) throw new NotFoundException('Pokemon not found')
				if (attempt >= RETRIES) {
					this.logger.warn(`PokeAPI ${url} failed: ${(error as Error).message}`)
					throw new BadGatewayException('PokeAPI is unavailable')
				}
				await new Promise(resolve => setTimeout(resolve, 300 * 2 ** attempt))
			}
		}
	}
}
