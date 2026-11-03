import jwt, { type JwtPayload } from 'jsonwebtoken'

export type DevJwtUser = {
  sub: string
  role: string
  /** Optional stable staff id. Prefer this over sub when comparing maker vs checker. */
  staffId?: string
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
  return jwt.sign(
    {
      sub: user.sub,
      role: user.role,
      ...(user.staffId ? { staffId: user.staffId } : {})
    },
    secret,
    {
      expiresIn: expiresInSeconds
    }
  )
}

export function verifyDevJwt(token: string, secret: string): DevJwtUser {
  if (!secret) {
    throw new Error('JWT_SECRET is not set')
  }
  const payload = jwt.verify(token, secret) as JwtPayload
  const sub = typeof payload.sub === 'string' ? payload.sub : ''
  const role = typeof payload.role === 'string' ? payload.role : ''
  const staffId =
    typeof payload.staffId === 'string' ? payload.staffId : undefined
  if (!sub || !role) {
    throw new Error('JWT must carry sub and role')
  }
  return staffId ? { sub, role, staffId } : { sub, role }
}
