/**
 * Reads TRUST_PROXY for Express: a hop count ("1"), a name ("loopback") or a list of addresses.
 * Left unset, the socket address is the client address, which is right when the backend is reached directly.
 */
export function parseTrustProxy(value: string | undefined): number | string | undefined {
	const trimmed = value?.trim()
	if (!trimmed || trimmed === '0' || trimmed === 'false') return undefined
	if (trimmed === 'true') {
		throw new Error('TRUST_PROXY=true would trust every proxy and let any client spoof its address: use a hop count (1), a name (loopback) or addresses')
	}
	return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed
}
