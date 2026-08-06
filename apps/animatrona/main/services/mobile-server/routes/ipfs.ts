/**
 * IPFS proxy route для Mobile Server
 *
 * Проксирует запросы к локальному IPFS gateway для доступа к видео, аудио, субтитрам и шрифтам.
 * Поддерживает Range requests для прогрессивного воспроизведения.
 *
 * GET /api/ipfs/:cid — возвращает контент из IPFS
 * HEAD /api/ipfs/:cid — возвращает только заголовки
 */

import type { IncomingMessage, ServerResponse } from 'http'
import { Readable } from 'stream'

import { getIpfsUrl } from '../../../utils/ipfs-url'
import { createModuleLogger } from '../../../utils/logger'

const log = createModuleLogger('MobileIPFS')

/** Размер чанка для streaming (64 KB) */
const _CHUNK_SIZE = 64 * 1024

/**
 * Парсит Range заголовок
 * @param range - значение заголовка Range (например, "bytes=0-1023")
 * @param fileSize - размер файла
 * @returns объект с start и end или null если невалидный
 */
function parseRange(range: string, fileSize: number): { start: number; end: number } | null {
  const match = range.match(/bytes=(\d*)-(\d*)/)
  if (!match) {
    return null
  }

  const start = match[1] ? parseInt(match[1], 10) : 0
  const end = match[2] ? parseInt(match[2], 10) : fileSize - 1

  if (start >= fileSize || end >= fileSize || start > end) {
    return null
  }

  return { start, end }
}

/**
 * Обработка запроса IPFS контента
 * GET/HEAD /api/ipfs/:cid
 *
 * @param isHead - true для HEAD запросов (только заголовки, без тела)
 */
export async function handleIpfsRequest(
  req: IncomingMessage,
  res: ServerResponse,
  cid: string,
  isHead = false,
): Promise<void> {
  if (!cid) {
    sendError(res, 400, 'Missing CID')
    return
  }

  const gatewayUrl = getIpfsUrl(cid)!
  const rangeHeader = req.headers.range

  // AbortController для отмены fetch при закрытии клиентского соединения
  const controller = new AbortController()
  const onClientClose = () => controller.abort()
  res.on('close', onClientClose)

  try {
    // Сначала делаем HEAD запрос чтобы узнать размер файла
    const headResponse = await fetch(gatewayUrl, { method: 'HEAD', signal: controller.signal })

    if (!headResponse.ok) {
      log.error('IPFS gateway error', { cid, status: headResponse.status })
      // Важно: закрываем body чтобы не утекало соединение
      await headResponse.body?.cancel().catch(() => {
        /* игнорируем */
      })
      sendError(res, headResponse.status, 'Failed to fetch from IPFS')
      return
    }

    // Закрываем body от HEAD запроса (он пустой, но соединение держится)
    await headResponse.body?.cancel().catch(() => {
      /* игнорируем */
    })

    const contentType = headResponse.headers.get('content-type') || 'application/octet-stream'
    const contentLengthStr = headResponse.headers.get('content-length')
    const fileSize = contentLengthStr ? parseInt(contentLengthStr, 10) : 0

    // Базовые заголовки
    const headers: Record<string, string | number> = {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=31536000', // Кэш на год (CID immutable)
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    }

    // Для HEAD запросов — только заголовки
    if (isHead) {
      if (fileSize > 0) {
        headers['Content-Length'] = fileSize
      }
      res.writeHead(200, headers)
      res.end()
      return
    }

    // Обработка Range requests
    if (rangeHeader && fileSize > 0) {
      const range = parseRange(rangeHeader, fileSize)

      if (!range) {
        // Невалидный Range
        res.writeHead(416, {
          'Content-Range': `bytes */${fileSize}`,
        })
        res.end('Requested range not satisfiable')
        return
      }

      const { start, end } = range
      const contentLength = end - start + 1

      log.debug('Range request', { cid: cid.substring(0, 12), start, end, contentLength })

      // Запрашиваем chunk из IPFS gateway с Range
      const rangeResponse = await fetch(gatewayUrl, {
        method: 'GET',
        headers: {
          Range: `bytes=${start}-${end}`,
        },
        signal: controller.signal,
      })

      if (!rangeResponse.ok && rangeResponse.status !== 206) {
        log.error('IPFS range request failed', { cid, status: rangeResponse.status })
        // Важно: закрываем body чтобы не утекало соединение
        await rangeResponse.body?.cancel().catch(() => {
          /* игнорируем */
        })
        sendError(res, rangeResponse.status, 'Failed to fetch range from IPFS')
        return
      }

      // Отправляем 206 Partial Content
      res.writeHead(206, {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Content-Length': contentLength,
      })

      // Stream response body
      if (rangeResponse.body) {
        pipeWebStreamToResponse(rangeResponse.body, res)
      } else {
        // Fallback если body недоступен
        const buffer = await rangeResponse.arrayBuffer()
        res.end(Buffer.from(buffer))
      }

      return
    }

    // Обычный GET запрос (без Range) — streaming
    log.debug('Full request', { cid: cid.substring(0, 12), fileSize })

    const getResponse = await fetch(gatewayUrl, { method: 'GET', signal: controller.signal })

    if (!getResponse.ok) {
      log.error('IPFS GET failed', { cid, status: getResponse.status })
      // Важно: закрываем body чтобы не утекало соединение
      await getResponse.body?.cancel().catch(() => {
        /* игнорируем */
      })
      sendError(res, getResponse.status, 'Failed to fetch from IPFS')
      return
    }

    if (fileSize > 0) {
      headers['Content-Length'] = fileSize
    }
    res.writeHead(200, headers)

    // Stream response body
    if (getResponse.body) {
      pipeWebStreamToResponse(getResponse.body, res)
    } else {
      // Fallback — буферизация (менее эффективно)
      log.warn('Response body not available for streaming, falling back to buffer')
      const buffer = await getResponse.arrayBuffer()
      res.end(Buffer.from(buffer))
    }
  } catch (error) {
    // Игнорируем ошибки когда клиент закрыл соединение
    const errorStr = String(error)
    if (errorStr.includes('terminated') || errorStr.includes('aborted') || errorStr.includes('AbortError')) {
      log.debug('Client closed connection', { cid: cid.substring(0, 12) })
      return
    }

    log.error('IPFS proxy error', { cid, error: errorStr })

    // Если gateway не запущен
    if (error instanceof TypeError && errorStr.includes('fetch failed')) {
      sendError(res, 503, 'IPFS gateway not running')
      return
    }

    sendError(res, 500, 'Failed to proxy IPFS request')
  } finally {
    res.removeListener('close', onClientClose)
  }
}

/**
 * Безопасный pipe из Web ReadableStream в Node ServerResponse
 * При закрытии клиентского соединения отменяет reader чтобы освободить TCP
 */
function pipeWebStreamToResponse(body: ReadableStream<Uint8Array>, res: ServerResponse): void {
  const reader = body.getReader()
  let cancelled = false

  const nodeStream = new Readable({
    async read() {
      try {
        if (cancelled) {
          this.push(null)
          return
        }
        const { done, value } = await reader.read()
        if (done) {
          this.push(null)
        } else {
          this.push(Buffer.from(value))
        }
      } catch (err) {
        // Игнорируем ошибки при отмене (клиент отключился)
        if (cancelled) {
          this.push(null)
          return
        }
        this.destroy(err instanceof Error ? err : new Error(String(err)))
      }
    },
    destroy(_err, callback) {
      cancelled = true
      reader.cancel().catch(() => {
        /* игнорируем */
      })
      callback(null)
    },
  })

  // При закрытии клиентского соединения — отменяем reader и уничтожаем stream
  res.on('close', () => {
    if (!cancelled) {
      cancelled = true
      reader.cancel().catch(() => {
        /* игнорируем */
      })
      nodeStream.destroy()
    }
  })

  nodeStream.pipe(res)
}

/** Отправить ошибку */
function sendError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: message }))
}
