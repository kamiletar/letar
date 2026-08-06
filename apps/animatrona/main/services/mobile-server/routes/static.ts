/**
 * Static files route для Mobile Server
 *
 * Раздаёт статические файлы mobile-ui для браузера
 */

import { createReadStream, existsSync, statSync } from 'fs'
import type { IncomingMessage, ServerResponse } from 'http'
import path from 'path'

import { createModuleLogger } from '../../../utils/logger'

const log = createModuleLogger('MobileStatic')

/** MIME-типы для статических файлов */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.wasm': 'application/wasm',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
}

/**
 * Обработка запроса на статический файл
 */
export async function handleStaticRequest(
  _req: IncomingMessage,
  res: ServerResponse,
  pathname: string,
  staticPath: string | null,
): Promise<void> {
  // Если нет пути к статике — возвращаем заглушку
  if (!staticPath) {
    sendFallbackHtml(res)
    return
  }

  // Безопасность: убираем .. и нормализуем путь
  const safePath = pathname.replace(/\.\./g, '').replace(/\/+/g, '/')

  // index.html для корня
  let filePath = path.join(staticPath, safePath === '/' ? 'index.html' : safePath)

  // Если файл не существует — пробуем index.html (SPA fallback)
  if (!existsSync(filePath)) {
    const indexPath = path.join(staticPath, 'index.html')
    if (existsSync(indexPath)) {
      filePath = indexPath
    } else {
      sendNotFound(res)
      return
    }
  }

  // Проверяем что это файл, а не директория
  const stat = statSync(filePath)
  if (stat.isDirectory()) {
    // Пробуем index.html в директории
    const dirIndex = path.join(filePath, 'index.html')
    if (existsSync(dirIndex)) {
      filePath = dirIndex
    } else {
      sendNotFound(res)
      return
    }
  }

  try {
    const ext = path.extname(filePath).toLowerCase()
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream'
    const fileSize = statSync(filePath).size

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': fileSize,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000',
    })

    const stream = createReadStream(filePath)
    stream.pipe(res)
  } catch (error) {
    log.error('Error serving static file', { path: filePath, error: String(error) })
    sendError(res, 500, 'Internal server error')
  }
}

/**
 * Заглушка HTML когда mobile-ui не собран
 */
function sendFallbackHtml(res: ServerResponse): void {
  const html = `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Animatrona Mobile</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      max-width: 400px;
      text-align: center;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 16px;
      color: #7c3aed;
    }
    p {
      color: #a1a1aa;
      line-height: 1.6;
    }
    .icon {
      font-size: 64px;
      margin-bottom: 24px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">📱</div>
    <h1>Animatrona Mobile</h1>
    <p>Мобильный интерфейс ещё не установлен. Скоро здесь появится возможность смотреть аниме с телефона!</p>
  </div>
</body>
</html>`

  res.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': Buffer.byteLength(html),
  })
  res.end(html)
}

/**
 * 404 Not Found
 */
function sendNotFound(res: ServerResponse): void {
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
}

/**
 * Ошибка сервера
 */
function sendError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: message }))
}
