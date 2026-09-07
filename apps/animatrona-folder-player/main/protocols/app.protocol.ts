/**
 * Кастомный протокол `app://` для раздачи статического экспорта Next.js (renderer/out)
 *
 * Заменяет `loadFile()` (`file://`) — под `file://` origin равен `null`, и Chromium блокирует
 * Web Worker и `fetch` к соседним файлам. SubtitlesOctopus (рендер ASS-субтитров) — и то, и
 * другое разом. Привилегированная стандартная схема снимает оба ограничения, а заодно и хак
 * `assetPrefix: './'` — абсолютные пути `/_next/...` резолвятся от корня схемы, как в обычном
 * вебе. См. .claude/rules/electron.md § 6.1 в PLAN.md этого приложения.
 */

import { app, protocol } from 'electron'
import { createReadStream } from 'node:fs'
import { stat as fsStat } from 'node:fs/promises'
import path from 'node:path'
import type { Readable } from 'node:stream'

/** Хост, под которым раздаётся статический экспорт: app://local/... */
const APP_HOST = 'local'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.map': 'application/json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain',
}

function getMimeType(filePath: string): string {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream'
}

function nodeStreamToWebStream(nodeStream: Readable): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(chunk))
      nodeStream.on('end', () => controller.close())
      nodeStream.on('error', (err) => controller.error(err))
    },
    cancel() {
      nodeStream.destroy()
    },
  })
}

/** Каталог статического экспорта Next.js: prod — resourcesPath, dev — не используется (loadURL http://localhost) */
function getOutDir(): string {
  return app.isPackaged
    ? path.join(process.resourcesPath, 'renderer', 'out')
    : path.join(app.getAppPath(), 'renderer', 'out')
}

/** Резолвит pathname запроса в файл внутри out/ — с защитой от выхода за пределы каталога */
function resolveOutFile(pathname: string): string {
  const outDir = getOutDir()
  let relative = decodeURIComponent(pathname)
  if (relative === '' || relative === '/') {
    relative = '/index.html'
  } else if (relative.endsWith('/')) {
    relative += 'index.html'
  }

  const resolved = path.normalize(path.join(outDir, relative))
  if (!resolved.startsWith(outDir)) {
    // Path traversal (../..) — отдаём index.html, как несуществующий путь
    return path.join(outDir, 'index.html')
  }
  return resolved
}

async function handleAppRequest(request: Request): Promise<Response> {
  const url = new URL(request.url)
  if (url.hostname !== APP_HOST) {
    return new Response('Not found', { status: 404 })
  }

  const filePath = resolveOutFile(url.pathname)

  let fileSize: number
  try {
    const fileStat = await fsStat(filePath)
    fileSize = fileStat.size
  } catch {
    return new Response('File not found', { status: 404 })
  }

  const stream = createReadStream(filePath)
  return new Response(nodeStreamToWebStream(stream), {
    status: 200,
    headers: {
      'Content-Type': getMimeType(filePath),
      'Content-Length': String(fileSize),
      'Cache-Control': 'no-cache',
    },
  })
}

/** Вызывать до app.whenReady() — регистрирует привилегии схемы */
export function registerAppProtocol(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: 'app',
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
      },
    },
  ])
}

/** Вызывать после app.whenReady() — навешивает обработчик протокола */
export function setupAppProtocolHandler(): void {
  protocol.handle('app', handleAppRequest)
}

/** URL, который грузит окно в проде — index.html корня статического экспорта */
export const APP_INDEX_URL = `app://${APP_HOST}/index.html`
