import axios, { type AxiosInstance, type CreateAxiosDefaults } from 'axios'

/**
 * HTTP client for an upstream API. Redirects are never followed: one would resend the request body (API key, refresh
 * token) to whatever host the response names, and would sidestep the URL checks done before the call.
 */
export const createUpstreamClient = (config: CreateAxiosDefaults): AxiosInstance =>
	axios.create({ ...config, maxRedirects: 0 })
