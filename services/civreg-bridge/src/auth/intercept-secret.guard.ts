import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { timingSafeEqual } from 'crypto'
import { loadEnv } from '../env'

const HEADER = 'x-civreg-intercept-secret'

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) {
    return false
  }
  return timingSafeEqual(left, right)
}

@Injectable()
export class InterceptSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = loadEnv().interceptSharedSecret
    if (!expected) {
      throw new UnauthorizedException('INTERCEPT_SHARED_SECRET is not set')
    }
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>
    }>()
    const raw = req.headers[HEADER]
    const provided = Array.isArray(raw) ? raw[0] : raw
    if (!provided || !safeEqual(provided, expected)) {
      throw new UnauthorizedException('invalid intercept secret')
    }
    return true
  }
}
