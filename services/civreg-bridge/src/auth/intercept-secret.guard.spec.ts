import { UnauthorizedException } from '@nestjs/common'
import { InterceptSecretGuard } from './intercept-secret.guard'

describe('InterceptSecretGuard', () => {
  const guard = new InterceptSecretGuard()

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgres://civreg:civreg@localhost:5433/civreg'
    process.env.INTERCEPT_SHARED_SECRET = 'demo-intercept-shared-secret'
  })

  function ctx(secret: string | undefined) {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: secret
            ? { 'x-civreg-intercept-secret': secret }
            : {}
        })
      })
    }
  }

  it('allows a matching shared secret', () => {
    expect(
      guard.canActivate(ctx('demo-intercept-shared-secret') as never)
    ).toBe(true)
  })

  it('refuses a missing or wrong secret', () => {
    expect(() => guard.canActivate(ctx(undefined) as never)).toThrow(
      UnauthorizedException
    )
    expect(() => guard.canActivate(ctx('wrong') as never)).toThrow(
      UnauthorizedException
    )
  })
})
