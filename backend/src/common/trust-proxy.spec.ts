import { parseTrustProxy } from './trust-proxy'

describe('parseTrustProxy', () => {
	it.each([undefined, '', '  ', '0', 'false'])('leaves proxy trust off for %j', value => {
		expect(parseTrustProxy(value)).toBeUndefined()
	})

	it('reads a hop count as a number', () => {
		expect(parseTrustProxy('1')).toBe(1)
		expect(parseTrustProxy(' 2 ')).toBe(2)
	})

	it('passes named ranges and address lists through', () => {
		expect(parseTrustProxy('loopback')).toBe('loopback')
		expect(parseTrustProxy('loopback, 10.0.0.0/8')).toBe('loopback, 10.0.0.0/8')
	})

	it('refuses to trust every proxy, which would let any client spoof its address', () => {
		expect(() => parseTrustProxy('true')).toThrow(/every proxy/)
	})
})
