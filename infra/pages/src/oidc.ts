import { createHash, randomBytes } from 'node:crypto'
import type { PagesConfig } from './config'

/** Минимальный клиент OIDC (authorization code) для входа через Ключницу. */

interface Discovery {
  authorization_endpoint: string
  token_endpoint: string
  userinfo_endpoint: string
}

export interface OidcClient {
  /** Адрес входа, состояние и PKCE-verifier: их надо сохранить в cookie до возврата */
  startLogin(): Promise<{ url: string; state: string; verifier: string }>
  /** Обмен кода на email пользователя */
  finishLogin(code: string, verifier?: string): Promise<{ email: string; verified: boolean }>
}

export function createOidcClient(config: PagesConfig, fetchImpl: typeof fetch = fetch): OidcClient {
  const redirectUri = `${config.baseUrl}/auth/callback`
  let discovery: Promise<Discovery> | null = null

  function discover(): Promise<Discovery> {
    discovery ??= fetchImpl(config.oidcDiscoveryUrl).then(async (res) => {
      if (!res.ok) { throw new Error(`OIDC discovery: ${res.status}`) }
      return (await res.json()) as Discovery
    })
    // Неудачный запрос не кэшируем, иначе сервис навсегда останется без входа
    discovery.catch(() => {
      discovery = null
    })
    return discovery
  }

  return {
    async startLogin() {
      const d = await discover()
      const state = randomBytes(24).toString('base64url')
      const url = new URL(d.authorization_endpoint)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('client_id', config.oidcClientId)
      url.searchParams.set('redirect_uri', redirectUri)
      url.searchParams.set('scope', 'openid email profile')
      url.searchParams.set('state', state)
      // Ключница требует PKCE для этого клиента
      const verifier = randomBytes(32).toString('base64url')
      url.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('base64url'))
      url.searchParams.set('code_challenge_method', 'S256')
      return { url: url.toString(), state, verifier }
    },
    async finishLogin(code, verifier) {
      const d = await discover()
      const tokenRes = await fetchImpl(d.token_endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          client_id: config.oidcClientId,
          client_secret: config.oidcClientSecret,
          ...(verifier ? { code_verifier: verifier } : {}),
        }),
      })
      if (!tokenRes.ok) {
        // Тело ответа Ключницы (invalid_grant и т.п.) — только в лог, не пользователю
        const detail = (await tokenRes.text().catch(() => '')).slice(0, 300)
        throw new Error(`OIDC token: ${tokenRes.status} ${detail}`)
      }
      const { access_token: accessToken } = (await tokenRes.json()) as { access_token?: string }
      if (!accessToken) { throw new Error('OIDC token: нет access_token') }
      const infoRes = await fetchImpl(d.userinfo_endpoint, { headers: { authorization: `Bearer ${accessToken}` } })
      if (!infoRes.ok) { throw new Error(`OIDC userinfo: ${infoRes.status}`) }
      const info = (await infoRes.json()) as { email?: string; email_verified?: boolean }
      if (!info.email) { throw new Error('OIDC userinfo: нет email') }
      return { email: info.email.toLowerCase(), verified: info.email_verified !== false }
    },
  }
}
