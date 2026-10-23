import { describe, expect, it } from 'bun:test'
import { createHash } from 'node:crypto'
import type { PagesConfig } from '../src/config'
import { createOidcClient } from '../src/oidc'

const config = {
  baseUrl: 'https://pages.test',
  oidcDiscoveryUrl: 'https://auth.test/.well-known/openid-configuration',
  oidcClientId: 'pages-prod',
  oidcClientSecret: 'secret',
} as PagesConfig

describe('oidc: PKCE', () => {
  it('отправляет code_challenge S256 и передаёт verifier при обмене кода', async () => {
    let tokenBody = ''
    const fakeFetch = (async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('openid-configuration')) {
        return Response.json({
          authorization_endpoint: 'https://auth.test/authorize',
          token_endpoint: 'https://auth.test/token',
          userinfo_endpoint: 'https://auth.test/userinfo',
        })
      }
      if (url.endsWith('/token')) {
        tokenBody = String(init?.body)
        return Response.json({ access_token: 'at' })
      }
      return Response.json({ email: 'A@B.com', email_verified: true })
    }) as typeof fetch

    const client = createOidcClient(config, fakeFetch)
    const { url, verifier } = await client.startLogin()
    const params = new URL(url).searchParams
    expect(params.get('code_challenge_method')).toBe('S256')
    expect(params.get('code_challenge')).toBe(createHash('sha256').update(verifier).digest('base64url'))

    await client.finishLogin('code1', verifier)
    expect(new URLSearchParams(tokenBody).get('code_verifier')).toBe(verifier)
  })
})

describe('oidc: подтверждённая почта', () => {
  async function verifiedFor(info: Record<string, unknown>) {
    const fakeFetch = (async (input: string | URL | Request) => {
      const url = String(input)
      if (url.endsWith('openid-configuration')) {
        return Response.json({
          authorization_endpoint: 'https://auth.test/authorize',
          token_endpoint: 'https://auth.test/token',
          userinfo_endpoint: 'https://auth.test/userinfo',
        })
      }
      if (url.endsWith('/token')) { return Response.json({ access_token: 'at' }) }
      return Response.json(info)
    }) as typeof fetch
    return (await createOidcClient(config, fakeFetch).finishLogin('c')).verified
  }

  it('true только при email_verified: true', async () => {
    expect(await verifiedFor({ email: 'a@b.com', email_verified: true })).toBe(true)
  })

  it('false при email_verified: false и когда поля нет', async () => {
    expect(await verifiedFor({ email: 'a@b.com', email_verified: false })).toBe(false)
    expect(await verifiedFor({ email: 'a@b.com' })).toBe(false)
  })
})
