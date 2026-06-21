/**
 * HTTP клиент qBittorrent Web API v2
 *
 * Тонкая обёртка над fetch() — без бизнес-логики, только запросы и парсинг.
 * Бизнес-логика (polling, события, персистентность) — в qbittorrent-service.ts.
 */

import { createModuleLogger } from '../../utils/logger'
import type {
  QBAddTorrentParams,
  QBittorrentConfig,
  QBSyncResponse,
  QBTorrentFile,
  QBTorrentFilter,
  QBTorrentInfo,
  QBTransferInfo,
} from './qbittorrent-types'

const log = createModuleLogger('QBittorrentClient')

/** Ошибка аутентификации qBittorrent */
export class QBittorrentAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'QBittorrentAuthError'
  }
}

/** Ошибка HTTP запроса qBittorrent */
export class QBittorrentRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message)
    this.name = 'QBittorrentRequestError'
  }
}

/**
 * Тонкий HTTP клиент qBittorrent Web API v2.
 *
 * Хранит SID cookie после login(). При 403 пытается перелогиниться один раз,
 * потом пробрасывает ошибку. Не управляет таймерами и событиями — это задача QBittorrentService.
 */
export class QBittorrentClient {
  private baseUrl = ''
  private sid: string | null = null
  private config: QBittorrentConfig | null = null

  /** Подключиться и авторизоваться */
  async login(config: QBittorrentConfig): Promise<void> {
    this.config = { ...config }
    this.baseUrl = config.url.replace(/\/+$/, '')

    const body = new URLSearchParams({
      username: config.username,
      password: config.password,
    })

    log.info('Login to qBittorrent', { url: this.baseUrl, username: config.username })

    const response = await fetch(`${this.baseUrl}/api/v2/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        // Referer + Origin обязательны для CSRF-защиты qBittorrent (особенно 5.x)
        Referer: this.baseUrl,
        Origin: this.baseUrl,
      },
      body: body.toString(),
    })

    if (!response.ok) {
      throw new QBittorrentAuthError(
        `Login failed: HTTP ${response.status} ${response.statusText}`,
      )
    }

    const text = await response.text()
    const trimmed = text.trim()

    if (trimmed === 'Fails.') {
      throw new QBittorrentAuthError('Login failed: неверный логин или пароль (Fails.)')
    }

    if (trimmed !== 'Ok.') {
      // Пустой ответ или неожиданное тело — возможен bypass auth или другая версия qBittorrent
      const detail = trimmed || '(пустой ответ от сервера)'
      throw new QBittorrentAuthError(`Login failed: ${detail}`)
    }

    // Извлекаем SID из Set-Cookie
    const setCookie = response.headers.get('set-cookie') ?? ''
    const sidMatch = /SID=([^;,\s]+)/.exec(setCookie)
    if (!sidMatch) {
      throw new QBittorrentAuthError('Login succeeded but SID cookie not found')
    }

    this.sid = sidMatch[1]
    log.info('Login successful', { sidLength: this.sid.length })
  }

  /** Проверить, авторизован ли клиент */
  isConnected(): boolean {
    return this.sid !== null && this.baseUrl !== ''
  }

  /** Получить версию qBittorrent */
  async getVersion(): Promise<string> {
    const response = await this.request('GET', '/api/v2/app/version')
    return (await response.text()).trim()
  }

  // ========================
  // Торренты
  // ========================

  /**
   * Добавить магнет-ссылку.
   *
   * Возвращает infoHash (извлечён из magnet, т.к. API не возвращает hash напрямую).
   */
  async addMagnet(params: QBAddTorrentParams): Promise<string> {
    // Извлекаем infoHash из магнет-ссылки для возврата.
    // Берём первый URL из urls (разделитель \n).
    const firstUrl = params.urls.split('\n')[0] ?? ''
    const hash = extractInfoHashFromMagnet(firstUrl)
    if (!hash) {
      throw new Error('Не удалось извлечь infoHash из магнет-ссылки')
    }

    const body = new URLSearchParams()
    body.set('urls', params.urls)
    if (params.savepath) {
      body.set('savepath', params.savepath)
    }
    if (params.category) {
      body.set('category', params.category)
    }
    if (params.paused !== undefined) {
      body.set('paused', String(params.paused))
    }
    if (params.sequentialDownload !== undefined) {
      body.set('sequentialDownload', String(params.sequentialDownload))
    }
    if (params.firstLastPiecePrio !== undefined) {
      body.set('firstLastPiecePrio', String(params.firstLastPiecePrio))
    }

    const response = await this.request('POST', '/api/v2/torrents/add', body)
    const text = await response.text()
    if (text.trim() !== 'Ok.') {
      throw new Error(`Не удалось добавить торрент: ${text}`)
    }

    log.info('Магнет добавлен', { hash, savepath: params.savepath })
    return hash.toLowerCase()
  }

  /** Получить список торрентов (с фильтром) */
  async getTorrents(filter?: QBTorrentFilter, category?: string): Promise<QBTorrentInfo[]> {
    const query = new URLSearchParams()
    if (filter) {
      query.set('filter', filter)
    }
    if (category) {
      query.set('category', category)
    }

    const response = await this.request('GET', `/api/v2/torrents/info?${query.toString()}`)
    return (await response.json()) as QBTorrentInfo[]
  }

  /** Получить информацию об одном торренте */
  async getTorrentInfo(hash: string): Promise<QBTorrentInfo | null> {
    const query = new URLSearchParams({ hashes: hash })
    const response = await this.request('GET', `/api/v2/torrents/info?${query.toString()}`)
    const list = (await response.json()) as QBTorrentInfo[]
    return list[0] ?? null
  }

  /** Получить список файлов торрента */
  async getFiles(hash: string): Promise<QBTorrentFile[]> {
    const query = new URLSearchParams({ hash })
    const response = await this.request('GET', `/api/v2/torrents/files?${query.toString()}`)
    return (await response.json()) as QBTorrentFile[]
  }

  // ========================
  // Sync API (дельты)
  // ========================

  /**
   * Получить изменения с последнего запроса.
   *
   * @param rid Response ID из предыдущего запроса (0 = первый)
   */
  async syncMainData(rid: number): Promise<QBSyncResponse> {
    const query = new URLSearchParams({ rid: String(rid) })
    const response = await this.request('GET', `/api/v2/sync/maindata?${query.toString()}`)
    return (await response.json()) as QBSyncResponse
  }

  // ========================
  // Управление
  // ========================

  /** Приостановить торренты */
  async pause(hashes: string[]): Promise<void> {
    const body = new URLSearchParams({ hashes: hashes.join('|') })
    // qBittorrent 5.0+ использует /stop, раньше /pause. Пробуем stop, при 404 fallback на pause.
    try {
      await this.request('POST', '/api/v2/torrents/stop', body)
    } catch (error) {
      if (error instanceof QBittorrentRequestError && error.status === 404) {
        log.debug('Fallback: /stop → /pause (qBittorrent < 5.0)')
        await this.request('POST', '/api/v2/torrents/pause', body)
      } else {
        throw error
      }
    }
  }

  /** Возобновить торренты */
  async resume(hashes: string[]): Promise<void> {
    const body = new URLSearchParams({ hashes: hashes.join('|') })
    try {
      await this.request('POST', '/api/v2/torrents/start', body)
    } catch (error) {
      if (error instanceof QBittorrentRequestError && error.status === 404) {
        log.debug('Fallback: /start → /resume (qBittorrent < 5.0)')
        await this.request('POST', '/api/v2/torrents/resume', body)
      } else {
        throw error
      }
    }
  }

  /** Удалить торренты */
  async delete(hashes: string[], deleteFiles: boolean): Promise<void> {
    const body = new URLSearchParams({
      hashes: hashes.join('|'),
      deleteFiles: String(deleteFiles),
    })
    await this.request('POST', '/api/v2/torrents/delete', body)
  }

  /** Перепроверить торренты */
  async recheck(hashes: string[]): Promise<void> {
    const body = new URLSearchParams({ hashes: hashes.join('|') })
    await this.request('POST', '/api/v2/torrents/recheck', body)
  }

  /**
   * Установить лимиты сидирования.
   *
   * @param ratioLimit Целевой ratio (-2 = default, -1 = infinity, >0 = конкретное)
   * @param seedingTimeLimit Лимит времени в минутах (-2/-1 аналогично)
   */
  async setShareLimits(
    hashes: string[],
    ratioLimit: number,
    seedingTimeLimit = -1,
  ): Promise<void> {
    const body = new URLSearchParams({
      hashes: hashes.join('|'),
      ratioLimit: String(ratioLimit),
      seedingTimeLimit: String(seedingTimeLimit),
      // qBittorrent 4.6+ требует inactiveSeedingTimeLimit
      inactiveSeedingTimeLimit: '-1',
    })
    await this.request('POST', '/api/v2/torrents/setShareLimits', body)
  }

  /**
   * Установить приоритет файлов.
   *
   * @param priority 0=skip, 1=normal, 6=high, 7=maximal
   */
  async setFilePriority(hash: string, fileIds: number[], priority: 0 | 1 | 6 | 7): Promise<void> {
    const body = new URLSearchParams({
      hash,
      id: fileIds.join('|'),
      priority: String(priority),
    })
    await this.request('POST', '/api/v2/torrents/filePrio', body)
  }

  // ========================
  // Глобальная статистика
  // ========================

  /** Получить глобальную скорость передачи */
  async getTransferInfo(): Promise<QBTransferInfo> {
    const response = await this.request('GET', '/api/v2/transfer/info')
    return (await response.json()) as QBTransferInfo
  }

  // ========================
  // Internal
  // ========================

  /**
   * Выполнить запрос с авторизацией.
   *
   * При 403 пытается перелогиниться один раз, потом пробрасывает ошибку.
   */
  private async request(
    method: 'GET' | 'POST',
    path: string,
    body?: URLSearchParams,
  ): Promise<Response> {
    if (!this.isConnected()) {
      throw new QBittorrentAuthError('Клиент не авторизован (вызовите login())')
    }

    const doFetch = async (): Promise<Response> => {
      const headers: Record<string, string> = {
        Cookie: `SID=${this.sid}`,
        Referer: this.baseUrl,
      }
      if (method === 'POST') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded'
      }

      return fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: method === 'POST' && body ? body.toString() : undefined,
      })
    }

    let response = await doFetch()

    // 403 → попробовать перелогиниться один раз
    if (response.status === 403 && this.config) {
      log.warn('Получен 403, пробую перелогиниться', { path })
      this.sid = null
      await this.login(this.config)
      response = await doFetch()
    }

    if (!response.ok) {
      throw new QBittorrentRequestError(
        `${method} ${path} failed: HTTP ${response.status} ${response.statusText}`,
        response.status,
      )
    }

    return response
  }
}

/**
 * Извлечь infoHash из магнет-ссылки.
 *
 * Поддерживает xt=urn:btih:HASH (v1) и xt=urn:btmh:HASH (v2).
 * Возвращает hash в нижнем регистре или null.
 */
export function extractInfoHashFromMagnet(magnet: string): string | null {
  // urn:btih:HASH — v1 (хэш 40 символов hex или 32 символа base32)
  const btihMatch = /xt=urn:btih:([a-fA-F0-9]{40}|[A-Z2-7]{32})/i.exec(magnet)
  if (btihMatch) {
    const hash = btihMatch[1]
    // Если base32 (32 символа заглавными A-Z2-7) — конвертируем в hex
    if (/^[A-Z2-7]{32}$/.test(hash)) {
      return base32ToHex(hash).toLowerCase()
    }
    return hash.toLowerCase()
  }

  // urn:btmh:HASH — v2 (хэш начинается с 1220 для sha256)
  const btmhMatch = /xt=urn:btmh:([a-fA-F0-9]+)/i.exec(magnet)
  if (btmhMatch) {
    return btmhMatch[1].toLowerCase()
  }

  return null
}

/** Конвертация base32 → hex (для v1 infoHash) */
function base32ToHex(base32: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const char of base32.toUpperCase()) {
    const idx = alphabet.indexOf(char)
    if (idx < 0) {
      return ''
    }
    bits += idx.toString(2).padStart(5, '0')
  }
  let hex = ''
  for (let i = 0; i + 4 <= bits.length; i += 4) {
    hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
  }
  return hex
}
