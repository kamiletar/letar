/**
 * Mobile Server — HTTP сервер для доступа к библиотеке с мобильных устройств
 *
 * Предоставляет API для просмотра аниме в локальной сети.
 * Паттерн аналогичен gateway-server.ts.
 *
 * Маршруты:
 * - GET /api/status — Статус сервера и информация
 * - GET /api/library — Список аниме
 * - GET /api/library/:animeId — Детали аниме с эпизодами
 * - GET /api/media — Стриминг видео (с Range support)
 * - GET /api/poster/:animeId — Постер аниме
 * - GET /api/progress/:episodeId — Получить прогресс
 * - POST /api/progress/:episodeId — Сохранить прогресс
 * - GET / — Мобильный UI (статика)
 */

import { EventEmitter } from 'events'
import type { IncomingMessage, Server, ServerResponse } from 'http'
import { createServer } from 'http'

import { createModuleLogger } from '../../utils/logger'
import { handleIpfsRequest } from './routes/ipfs'
import { handleLibraryRequest } from './routes/library'
import { handleMediaRequest } from './routes/media'
import { handleLastWatchedRequest, handleProgressRequest } from './routes/progress'
import { handleStaticRequest } from './routes/static'
import { handleIpfsSubtitlesRequest, handleSubtitlesRequest } from './routes/subtitles'
import type { MobileServerStatus } from './types'
import { getAllLocalIPs, getLocalIP } from './utils'

const log = createModuleLogger('MobileServer')

/** Опции сервера */
export interface MobileServerOptions {
  /** Порт (по умолчанию 4000) */
  port?: number
  /** Путь к статическим файлам mobile-ui */
  staticPath?: string
}

const DEFAULT_PORT = 4000

/**
 * Mobile Server
 *
 * Singleton сервер для мобильного доступа к библиотеке
 */
export class MobileServer extends EventEmitter {
  private static instance: MobileServer | null = null
  private server: Server | null = null
  private port: number | null = null
  private localIp: string | null = null
  private requestCount = 0
  private staticPath: string | null = null

  private constructor() {
    super()
  }

  /** Получить singleton instance */
  static getInstance(): MobileServer {
    if (!MobileServer.instance) {
      MobileServer.instance = new MobileServer()
    }
    return MobileServer.instance
  }

  /** Запустить сервер */
  async start(options: MobileServerOptions = {}): Promise<void> {
    if (this.server) {
      log.info('Сервер уже запущен')
      return
    }

    const preferredPort = options.port ?? DEFAULT_PORT
    this.staticPath = options.staticPath ?? null

    // Получаем локальный IP
    this.localIp = getLocalIP()
    if (!this.localIp) {
      log.warn('Не удалось определить локальный IP, используем 0.0.0.0')
    }

    this.server = createServer((req, res) => this.handleRequest(req, res))

    // Пробуем запустить на указанном порту
    this.port = await this.tryListen(preferredPort)

    log.info('Mobile Server запущен', {
      url: `http://${this.localIp || 'localhost'}:${this.port}`,
    })
    this.emit('started', this.getStatus())
  }

  /** Попытаться запустить сервер на порту */
  private tryListen(port: number): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        reject(new Error('Сервер не создан'))
        return
      }

      this.server.once('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          log.info('Порт занят, пробую случайный', { port })
          // Порт занят — пробуем случайный (0)
          this.server!.listen(0, '0.0.0.0', () => {
            const addr = this.server!.address()
            if (addr && typeof addr === 'object') {
              resolve(addr.port)
            } else {
              reject(new Error('Не удалось получить порт'))
            }
          })
        } else {
          reject(err)
        }
      })

      // Слушаем на всех интерфейсах (0.0.0.0) для доступа из локальной сети
      this.server.listen(port, '0.0.0.0', () => {
        resolve(port)
      })
    })
  }

  /** Остановить сервер */
  async stop(): Promise<void> {
    if (!this.server) {
      return
    }

    return new Promise((resolve, reject) => {
      this.server!.close((err) => {
        if (err) {
          log.error('Ошибка при остановке', { error: String(err) })
          reject(err)
        } else {
          log.info('Mobile Server остановлен')
          this.server = null
          this.port = null
          this.emit('stopped')
          resolve()
        }
      })
    })
  }

  /** Получить статус сервера */
  getStatus(): MobileServerStatus {
    return {
      isRunning: this.server !== null,
      port: this.port,
      localIp: this.localIp,
      allIps: getAllLocalIPs(),
      url: this.port && this.localIp ? `http://${this.localIp}:${this.port}` : null,
      requestCount: this.requestCount,
    }
  }

  /** Обновить локальный IP (при смене сети) */
  refreshLocalIp(): void {
    this.localIp = getLocalIP()
    log.info('Local IP обновлён', { ip: this.localIp })
  }

  /** Обработка HTTP запроса */
  private async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    this.requestCount++

    // CORS headers для доступа с мобильных браузеров
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range')
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges')

    // Preflight
    if (req.method === 'OPTIONS') {
      res.writeHead(204)
      res.end()
      return
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`)
    const pathname = url.pathname

    try {
      // API маршруты
      if (pathname.startsWith('/api/')) {
        await this.handleApiRequest(req, res, pathname, url)
        return
      }

      // Статические файлы (mobile-ui)
      await handleStaticRequest(req, res, pathname, this.staticPath)
    } catch (error) {
      log.error('Ошибка обработки запроса', { error: String(error), url: pathname })
      this.sendError(res, 500, error instanceof Error ? error.message : 'Internal Server Error')
    }
  }

  /** Обработка API запросов */
  private async handleApiRequest(req: IncomingMessage, res: ServerResponse, pathname: string, url: URL): Promise<void> {
    // GET /api/status
    if (pathname === '/api/status') {
      await this.handleStatusRequest(res)
      return
    }

    // GET /api/library
    if (pathname === '/api/library' && req.method === 'GET') {
      await handleLibraryRequest(req, res, 'list')
      return
    }

    // GET /api/library/:animeId
    const libraryMatch = pathname.match(/^\/api\/library\/([^/]+)$/)
    if (libraryMatch && req.method === 'GET') {
      await handleLibraryRequest(req, res, 'details', libraryMatch[1])
      return
    }

    // GET /api/media?path=...
    if (pathname === '/api/media' && req.method === 'GET') {
      const filePath = url.searchParams.get('path')
      if (!filePath) {
        this.sendError(res, 400, 'Missing path parameter')
        return
      }
      await handleMediaRequest(req, res, filePath)
      return
    }

    // GET /api/poster/:animeId
    const posterMatch = pathname.match(/^\/api\/poster\/([^/]+)$/)
    if (posterMatch && req.method === 'GET') {
      await handleLibraryRequest(req, res, 'poster', posterMatch[1])
      return
    }

    // GET /api/last-watched — последний просмотренный эпизод
    if (pathname === '/api/last-watched' && req.method === 'GET') {
      await handleLastWatchedRequest(res)
      return
    }

    // GET/POST /api/progress/:episodeId
    const progressMatch = pathname.match(/^\/api\/progress\/([^/]+)$/)
    if (progressMatch) {
      await handleProgressRequest(req, res, progressMatch[1])
      return
    }

    // GET /api/subtitles?path=...
    if (pathname === '/api/subtitles' && req.method === 'GET') {
      const subtitlePath = url.searchParams.get('path')
      if (!subtitlePath) {
        this.sendError(res, 400, 'Missing path parameter')
        return
      }
      await handleSubtitlesRequest(req, res, subtitlePath)
      return
    }

    // GET/HEAD /api/ipfs/:cid — проксирование IPFS контента (субтитры, шрифты, видео)
    const ipfsMatch = pathname.match(/^\/api\/ipfs\/(.+)$/)
    if (ipfsMatch && (req.method === 'GET' || req.method === 'HEAD')) {
      await handleIpfsRequest(req, res, ipfsMatch[1], req.method === 'HEAD')
      return
    }

    // GET /api/subtitles/cid/:cid?format=ass — субтитры из IPFS конвертированные в VTT
    const ipfsSubMatch = pathname.match(/^\/api\/subtitles\/cid\/(.+)$/)
    if (ipfsSubMatch && req.method === 'GET') {
      const format = url.searchParams.get('format') || 'ass'
      await handleIpfsSubtitlesRequest(req, res, ipfsSubMatch[1], format)
      return
    }

    // 404 для неизвестных API маршрутов
    this.sendError(res, 404, 'API endpoint not found')
  }

  /** Обработка /api/status */
  private async handleStatusRequest(res: ServerResponse): Promise<void> {
    const status = this.getStatus()

    // Импортируем динамически чтобы избежать циклических зависимостей
    const { app } = await import('electron')
    const { getDb } = await import('../database')

    const db = getDb()
    const settings = await db.settings.findUnique({ where: { id: 'default' } })
    const animeCount = await db.anime.count()

    const response = {
      version: app.getVersion(),
      libraryPath: settings?.libraryPath ?? null,
      animeCount,
      server: status,
    }

    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(response))
  }

  /** Отправить ошибку */
  private sendError(res: ServerResponse, status: number, message: string): void {
    res.writeHead(status, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: message }))
  }
}

/** Получить singleton instance */
export function getMobileServer(): MobileServer {
  return MobileServer.getInstance()
}
