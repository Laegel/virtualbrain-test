import { mapLimit } from './map-limit'

describe('mapLimit', () => {
	it('keeps order and never exceeds the concurrency limit', async () => {
		let inFlight = 0
		let peak = 0
		const out = await mapLimit([5, 1, 4, 2, 3, 0], 2, async n => {
			peak = Math.max(peak, ++inFlight)
			await new Promise(r => setTimeout(r, n))
			inFlight--
			return n * 10
		})
		expect(out).toEqual([50, 10, 40, 20, 30, 0])
		expect(peak).toBe(2)
	})

	it('stops scheduling new items after a failure and rejects only once the running ones are done', async () => {
		const started: number[] = []
		const finished: number[] = []
		const run = mapLimit([0, 1, 2, 3, 4, 5], 2, async n => {
			started.push(n)
			await new Promise(r => setTimeout(r, n === 0 ? 5 : 30))
			if (n === 0) throw new Error('boom')
			finished.push(n)
			return n
		})

		await expect(run).rejects.toThrow('boom')
		// item 1 was already running when item 0 failed: it must be finished before the rejection is seen
		expect(finished).toEqual([1])
		expect(started).toEqual([0, 1])
	})

	it('rejects with the first error when several items fail', async () => {
		const run = mapLimit([0, 1], 2, async n => {
			await new Promise(r => setTimeout(r, n === 0 ? 5 : 15))
			throw new Error(`failed ${n}`)
		})
		await expect(run).rejects.toThrow('failed 0')
	})
})
