import { mintDevJwt, verifyDevJwt } from './jwt'

describe('dev JWT (Keycloak stand-in)', () => {
  const secret = 'demo-civreg-jwt-not-a-real-secret'

  it('round-trips sub and role', () => {
    const token = mintDevJwt(
      { sub: 'checker-9', role: 'nimc_civreg_checker' },
      secret
    )
    expect(verifyDevJwt(token, secret)).toEqual({
      sub: 'checker-9',
      role: 'nimc_civreg_checker'
    })
  })

  it('rejects a token signed with a different secret', () => {
    const token = mintDevJwt(
      { sub: 'checker-9', role: 'nimc_civreg_checker' },
      secret
    )
    expect(() => verifyDevJwt(token, 'other')).toThrow()
  })
})
