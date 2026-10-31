import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { loadEnv } from '../env'
import { verifyDevJwt, type DevJwtUser } from './jwt'

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{
      headers: { authorization?: string }
      user?: DevJwtUser
    }>()
    const header = req.headers.authorization ?? ''
    const match = /^Bearer\s+(.+)$/i.exec(header)
    if (!match) {
      throw new UnauthorizedException('Bearer token required')
    }
    try {
      req.user = verifyDevJwt(match[1], loadEnv().jwtSecret)
      return true
    } catch {
      throw new UnauthorizedException('invalid token')
    }
  }
}
