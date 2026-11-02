import { ValidationPipe } from '@nestjs/common'

/** Strip unknown fields and reject them, coerce types: every DTO is validated at the edge */
export const createValidationPipe = () => new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
