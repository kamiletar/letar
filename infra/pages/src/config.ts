/** Настройки сервиса страниц. Всё читается из окружения; секреты в репозиторий не попадают. */

export interface PagesConfig {
  port: number
  /** Каталог хранения: `<dataPath>/<slug>/v<N>/…` и `meta.json` рядом */
  dataPath: string
  /** Публичный адрес сервиса без завершающего `/`, например https://pages.letar.best */
  baseUrl: string
  /** Токен публикации (Bearer) для MCP `letar` */
  publishToken: string
  /** Ключ подписи сессионных cookie */
  sessionSecret: string
  /** Email, которым разрешён просмотр приватных страниц */
  ownerEmails: string[]
  /** OIDC Ключницы: адрес discovery и данные клиента */
  oidcDiscoveryUrl: string
  oidcClientId: string
  oidcClientSecret: string
  /** Предел размера одной версии в байтах */
  maxVersionBytes: number
  maxFiles: number
}

function required(env: Record<string, string | undefined>, key: string): string {
  const value = env[key]
  if (!value) {
    throw new Error(`Не задана переменная окружения ${key}`)
  }
  return value
}

export function loadConfig(env: Record<string, string | undefined> = process.env): PagesConfig {
  return {
    port: Number(env.PORT ?? 3200),
    dataPath: env.DATA_PATH ?? '/data/pages',
    baseUrl: required(env, 'BASE_URL').replace(/\/+$/, ''),
    publishToken: required(env, 'PAGES_PUBLISH_TOKEN'),
    sessionSecret: required(env, 'PAGES_SESSION_SECRET'),
    ownerEmails: required(env, 'PAGES_OWNER_EMAILS').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
    oidcDiscoveryUrl: required(env, 'OIDC_DISCOVERY_URL'),
    oidcClientId: required(env, 'OIDC_CLIENT_ID'),
    oidcClientSecret: required(env, 'OIDC_CLIENT_SECRET'),
    maxVersionBytes: Number(env.PAGES_MAX_VERSION_BYTES ?? 5 * 1024 * 1024),
    maxFiles: Number(env.PAGES_MAX_FILES ?? 100),
  }
}
