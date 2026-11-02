import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import type { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { parseTrustProxy } from './common/trust-proxy'
import { createValidationPipe } from './common/validation'

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule)

	app.disable('x-powered-by')
	// Behind a reverse proxy every client has the proxy's address, so set TRUST_PROXY to share the rate limits fairly
	const trustProxy = parseTrustProxy(process.env.TRUST_PROXY)
	if (trustProxy !== undefined) app.set('trust proxy', trustProxy)
	app.use(helmet())
	app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:5173', exposedHeaders: ['Content-Disposition'] })
	app.useGlobalPipes(createValidationPipe())

	const port = Number(process.env.PORT ?? 3001)
	await app.listen(port)
	console.log('Server started on port:', port)
}

bootstrap()
