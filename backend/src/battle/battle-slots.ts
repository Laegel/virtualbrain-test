import { HttpException, HttpStatus } from '@nestjs/common'

/** A fixed number of fights that may run at once, shared by every route and every client. */
export class BattleSlots {
	private active = 0

	constructor(private readonly max: number) {}

	/** Takes a slot or answers 429. The returned function gives it back; calling it twice is harmless. */
	acquire(): () => void {
		if (this.active >= this.max) {
			throw new HttpException('The arena is busy, try again in a moment', HttpStatus.TOO_MANY_REQUESTS)
		}
		this.active++
		let released = false
		return () => {
			if (!released) {
				released = true
				this.active--
			}
		}
	}
}
