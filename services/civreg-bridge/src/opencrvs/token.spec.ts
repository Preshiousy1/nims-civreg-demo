import { buildTokenRequest } from './token'

describe('buildTokenRequest', () => {
  it('puts client_credentials in the body, never the URL', () => {
    const req = buildTokenRequest({
      tokenUrl: 'http://gateway.opencrvs.localhost/auth/token',
      clientId: 'demo-id',
      clientSecret: 'demo-secret'
    })
    expect(req.url).toBe('http://gateway.opencrvs.localhost/auth/token')
    expect(req.url).not.toContain('?')
    expect(req.url).not.toContain('client_secret')
    expect(req.headers['Content-Type']).toBe(
      'application/x-www-form-urlencoded'
    )
    expect(req.body).toContain('grant_type=client_credentials')
    expect(req.body).toContain('client_id=demo-id')
    expect(req.body).toContain('client_secret=demo-secret')
  })

  it('refuses a token URL that already has a query string', () => {
    expect(() =>
      buildTokenRequest({
        tokenUrl: 'http://gateway/auth/token?client_id=x',
        clientId: 'demo-id',
        clientSecret: 'demo-secret'
      })
    ).toThrow(/query string/)
  })
})
