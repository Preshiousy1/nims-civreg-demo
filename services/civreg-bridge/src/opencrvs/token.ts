/**
 * Client-credentials token. Parameters go in the BODY, never the query string.
 * Core rejects query-string client_secret in every non-production environment.
 * https://documentation.opencrvs.org/technical/guides/configuration/integrations/authenticate-a-client.md
 */
export type TokenRequest = {
  tokenUrl: string
  clientId: string
  clientSecret: string
}

export function buildTokenRequest(input: TokenRequest): {
  url: string
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  body: string
} {
  if (input.tokenUrl.includes('?')) {
    throw new Error('OPENCRVS_TOKEN_URL must not contain a query string')
  }
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: input.clientId,
    client_secret: input.clientSecret
  })
  return {
    url: input.tokenUrl,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  }
}

export async function fetchSystemToken(input: TokenRequest): Promise<string> {
  const req = buildTokenRequest(input)
  const res = await fetch(req.url, {
    method: 'POST',
    headers: req.headers,
    body: req.body
  })
  if (!res.ok) {
    throw new Error(`token request failed: ${res.status}`)
  }
  const json = (await res.json()) as { access_token?: string }
  if (!json.access_token) {
    throw new Error('token response had no access_token')
  }
  return json.access_token
}
