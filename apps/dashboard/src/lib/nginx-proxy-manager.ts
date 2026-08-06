/**
 * Клиент для Nginx Proxy Manager API
 * Поддерживает многосерверную архитектуру
 *
 * API документация:
 * https://github.com/NginxProxyManager/nginx-proxy-manager/discussions/3527
 */

// === Типы данных ===

/** Конфигурация NPM для сервера */
export interface NpmConfig {
  url: string
  email: string
  password: string
}

/** Proxy Host из NPM */
export interface NpmProxyHost {
  id: number
  created_on: string
  modified_on: string
  owner_user_id: number
  domain_names: string[]
  forward_host: string
  forward_port: number
  forward_scheme: 'http' | 'https'
  access_list_id: number
  certificate_id: number
  ssl_forced: boolean
  caching_enabled: boolean
  block_exploits: boolean
  advanced_config: string
  enabled: number | boolean // NPM API может возвращать 0/1 или true/false
  meta: Record<string, unknown>
  http2_support: number
  hsts_enabled: number
  hsts_subdomains: number
  allow_websocket_upgrade: number
  locations: NpmLocation[]
}

/** Location внутри proxy host */
export interface NpmLocation {
  path: string
  forward_host: string
  forward_port: number
  forward_scheme: 'http' | 'https'
  advanced_config: string
}

/** Данные для создания/обновления proxy host */
export interface NpmProxyHostCreate {
  domain_names: string[]
  forward_host: string
  forward_port: number
  forward_scheme?: 'http' | 'https'
  access_list_id?: number
  certificate_id?: number | 'new'
  ssl_forced?: boolean
  caching_enabled?: boolean
  block_exploits?: boolean
  advanced_config?: string
  enabled?: boolean
  http2_support?: boolean
  hsts_enabled?: boolean
  hsts_subdomains?: boolean
  allow_websocket_upgrade?: boolean
  locations?: NpmLocation[]
  meta?: Record<string, unknown>
}

/** SSL сертификат из NPM */
export interface NpmCertificate {
  id: number
  created_on: string
  modified_on: string
  owner_user_id: number
  provider: 'letsencrypt' | 'other'
  nice_name: string
  domain_names: string[]
  expires_on: string
  meta: Record<string, unknown>
}

/** Access List из NPM */
export interface NpmAccessList {
  id: number
  created_on: string
  modified_on: string
  owner_user_id: number
  name: string
  satisfy_any: number
  pass_auth: number
  items: NpmAccessListAuth[]
  clients: NpmAccessListClient[]
  proxy_host_count?: number
}

/** Авторизация в Access List */
export interface NpmAccessListAuth {
  username: string
  password: string
}

/** IP правило в Access List */
export interface NpmAccessListClient {
  address: string
  directive: 'allow' | 'deny'
}

/** Статус подключения к NPM */
export interface NpmStatus {
  status: 'healthy' | 'error'
  version?: string
  error?: string
}

// === Кеш токенов ===

/** Кешированные токены JWT по URL сервера */
const tokenCache = new Map<string, { token: string; expiresAt: number }>()

/**
 * Клиент для работы с Nginx Proxy Manager API
 * Поддерживает как локальную конфигурацию (env), так и удалённую (из БД)
 */
class NpmApiClient {
  private baseUrl: string
  private email: string
  private password: string
  private cacheKey: string

  constructor(config?: NpmConfig) {
    if (config) {
      // Конфигурация от сервера (из БД)
      this.baseUrl = config.url
      this.email = config.email
      this.password = config.password
    } else {
      // Локальная конфигурация (из env)
      this.baseUrl = process.env.NPM_API_URL || 'http://localhost:81'
      this.email = process.env.NPM_API_EMAIL || ''
      this.password = process.env.NPM_API_PASSWORD || ''
    }
    this.cacheKey = this.baseUrl
  }

  /**
   * Получение JWT токена с кешированием
   * Токен кешируется на 23 часа (запас перед истечением 24ч)
   */
  private async getToken(): Promise<string> {
    // Проверяем кеш (минус 1 час на всякий случай)
    const cached = tokenCache.get(this.cacheKey)
    if (cached && Date.now() < cached.expiresAt - 3600000) {
      return cached.token
    }

    const res = await fetch(`${this.baseUrl}/api/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identity: this.email,
        secret: this.password,
      }),
    })

    if (!res.ok) {
      const text = await res.text()
      throw new Error(`NPM Auth failed: ${res.status} - ${text}`)
    }

    const data = await res.json()

    // Кешируем на 24 часа
    tokenCache.set(this.cacheKey, {
      token: data.token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    })

    return data.token
  }

  /**
   * Выполнение запроса к API с автоматической авторизацией
   */
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getToken()

    const res = await fetch(`${this.baseUrl}/api${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    })

    if (!res.ok) {
      const error = await res.text()
      throw new Error(`NPM API Error: ${res.status} - ${error}`)
    }

    // DELETE возвращает 204 No Content
    if (res.status === 204) {
      return {} as T
    }

    return res.json()
  }

  // === Проверка статуса ===

  /** Проверка подключения к NPM */
  async getStatus(): Promise<NpmStatus> {
    try {
      await this.getToken()
      return { status: 'healthy' }
    } catch (error) {
      return {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // === Proxy Hosts ===

  /** Получить список всех proxy hosts */
  async getProxyHosts(): Promise<NpmProxyHost[]> {
    return this.request<NpmProxyHost[]>('/nginx/proxy-hosts')
  }

  /** Получить proxy host по ID */
  async getProxyHost(id: number): Promise<NpmProxyHost> {
    return this.request<NpmProxyHost>(`/nginx/proxy-hosts/${id}`)
  }

  /** Создать новый proxy host */
  async createProxyHost(data: NpmProxyHostCreate): Promise<NpmProxyHost> {
    // NPM API ожидает числа (0/1) для всех boolean полей
    const apiData = {
      ...data,
      ssl_forced: data.ssl_forced ? 1 : 0,
      http2_support: data.http2_support ? 1 : 0,
      hsts_enabled: data.hsts_enabled ? 1 : 0,
      hsts_subdomains: data.hsts_subdomains ? 1 : 0,
      allow_websocket_upgrade: data.allow_websocket_upgrade ? 1 : 0,
      block_exploits: data.block_exploits ? 1 : 0,
      caching_enabled: data.caching_enabled ? 1 : 0,
    }

    const host = await this.request<NpmProxyHost>('/nginx/proxy-hosts', {
      method: 'POST',
      body: JSON.stringify(apiData),
    })

    // NPM сбрасывает ssl_forced и http2_support при создании хоста с новым сертификатом.
    // Применяем эти настройки отдельным UPDATE — так же, как делает NPM веб-интерфейс.
    if (data.ssl_forced || data.http2_support) {
      return this.updateProxyHost(host.id, {
        ssl_forced: data.ssl_forced,
        http2_support: data.http2_support,
      })
    }

    return host
  }

  /** Обновить proxy host */
  async updateProxyHost(id: number, data: Partial<NpmProxyHostCreate>): Promise<NpmProxyHost> {
    // NPM API ожидает числа (0/1) для некоторых boolean полей
    const apiData = {
      ...data,
      ...(data.ssl_forced !== undefined && { ssl_forced: data.ssl_forced ? 1 : 0 }),
      ...(data.http2_support !== undefined && { http2_support: data.http2_support ? 1 : 0 }),
      ...(data.hsts_enabled !== undefined && { hsts_enabled: data.hsts_enabled ? 1 : 0 }),
      ...(data.hsts_subdomains !== undefined && { hsts_subdomains: data.hsts_subdomains ? 1 : 0 }),
      ...(data.allow_websocket_upgrade !== undefined && {
        allow_websocket_upgrade: data.allow_websocket_upgrade ? 1 : 0,
      }),
      ...(data.block_exploits !== undefined && { block_exploits: data.block_exploits ? 1 : 0 }),
      ...(data.caching_enabled !== undefined && { caching_enabled: data.caching_enabled ? 1 : 0 }),
    }

    return this.request<NpmProxyHost>(`/nginx/proxy-hosts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(apiData),
    })
  }

  /** Удалить proxy host */
  async deleteProxyHost(id: number): Promise<void> {
    await this.request(`/nginx/proxy-hosts/${id}`, { method: 'DELETE' })
  }

  /** Включить/выключить proxy host */
  async toggleProxyHost(id: number, enabled: boolean): Promise<NpmProxyHost> {
    // NPM API использует 0/1 для enabled
    return this.updateProxyHost(id, { enabled })
  }

  // === Certificates ===

  /** Получить список всех сертификатов */
  async getCertificates(): Promise<NpmCertificate[]> {
    return this.request<NpmCertificate[]>('/nginx/certificates')
  }

  /** Получить сертификат по ID */
  async getCertificate(id: number): Promise<NpmCertificate> {
    return this.request<NpmCertificate>(`/nginx/certificates/${id}`)
  }

  /** Удалить сертификат */
  async deleteCertificate(id: number): Promise<void> {
    await this.request(`/nginx/certificates/${id}`, { method: 'DELETE' })
  }

  // === Access Lists ===

  /** Получить список всех access lists */
  async getAccessLists(): Promise<NpmAccessList[]> {
    return this.request<NpmAccessList[]>('/nginx/access-lists')
  }

  /** Получить access list по ID */
  async getAccessList(id: number): Promise<NpmAccessList> {
    return this.request<NpmAccessList>(`/nginx/access-lists/${id}`)
  }

  /** Удалить access list */
  async deleteAccessList(id: number): Promise<void> {
    await this.request(`/nginx/access-lists/${id}`, { method: 'DELETE' })
  }
}

/** Синглтон экземпляр клиента для локального сервера */
export const npmApi = new NpmApiClient()

/**
 * Создать NPM клиент для конкретного сервера
 * @param config - конфигурация NPM от сервера
 */
export function createNpmClient(config: NpmConfig): NpmApiClient {
  return new NpmApiClient(config)
}

/**
 * Получить NPM клиент для сервера (по данным из БД или локальный)
 * @param server - данные сервера с NPM конфигурацией
 */
export function getNpmClientForServer(
  server: {
    npmUrl?: string | null
    npmEmail?: string | null
    npmPassword?: string | null
  } | null,
): NpmApiClient {
  // Если сервер не указан или нет NPM конфигурации — используем локальный
  if (!server || !server.npmUrl || !server.npmEmail || !server.npmPassword) {
    return npmApi
  }

  return createNpmClient({
    url: server.npmUrl,
    email: server.npmEmail,
    password: server.npmPassword,
  })
}
