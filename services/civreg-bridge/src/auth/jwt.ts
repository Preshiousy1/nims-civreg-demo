import jwt, { type JwtPayload } from 'jsonwebtoken'

export type DevJwtUser = {
  sub: string
  role: string
}

export const CHECKER_ROLES = new Set(['nimc_civreg_checker', 'checker'])

export function isCheckerRole(role: string): boolean {
  return CHECKER_ROLES.has(role)
}

export function mintDevJwt(
  user: DevJwtUser,
  secret: string,
  expiresInSeconds = 60 * 60 * 8
): string {
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  return jwt.sign({ sub: user.sub, role: user.role }, secret, {
    expiresIn: expiresInSeconds
  })
}

export function verifyDevJwt(token: string, secret: string): DevJwtUser {
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  const payload = jwt.verify(token, secret) as JwtPayload
  const sub = typeof payload.sub === 'string' ? payload.sub : ''
  const role = typeof payload.role === 'string' ? payload.role : ''
  if (!sub || !role) {
    throw new Error('JWT must carry sub and role')
  }
  return { sub, role }
}
