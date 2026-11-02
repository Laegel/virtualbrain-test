import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import type { Request } from 'express'

/**
 * Refuses requests a browser marks as coming from another site. CORS only hides the response: it does not stop a
 * page on another site from making the browser fire a GET (or HEAD) that has a side effect.
 * Same-site (the web app on another port of localhost), same-origin, direct navigation and non-browser clients pass.
 */
@Injectable()
export class RejectCrossSiteGuard implements CanActivate {
	canActivate(context: ExecutionContext): boolean {
		const { headers } = context.switchToHttp().getRequest<Request>()
		if (headers['sec-fetch-site'] === 'cross-site') throw new ForbiddenException('Cross-site requests are not allowed here')
		return true
	}
}
