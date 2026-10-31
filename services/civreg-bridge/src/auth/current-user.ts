import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { DevJwtUser } from './jwt'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): DevJwtUser => {
    const req = ctx.switchToHttp().getRequest<{ user: DevJwtUser }>()
    return req.user
  }
)
