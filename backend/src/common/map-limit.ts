/**
 * Like Promise.all(items.map(fn)) but with at most `limit` calls in flight. Preserves order.
 * After the first failure nothing new is started, and the returned promise only settles once every call that was
 * already running has finished, so a caller that retries never overlaps with leftovers of the failed run.
 */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]> {
	const results = new Array<R>(items.length)
	let next = 0
	let failure: { error: unknown } | undefined

	const worker = async () => {
		while (!failure && next < items.length) {
			const index = next++
			try {
				results[index] = await fn(items[index], index)
			} catch (error) {
				failure ??= { error }
			}
		}
	}

	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
	if (failure) throw failure.error
	return results
}
