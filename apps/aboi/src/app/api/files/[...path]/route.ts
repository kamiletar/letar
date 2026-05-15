import { NextResponse } from 'next/server'
import { createReadStream, type ReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'

const UPLOADS_ROOT = path.join(process.cwd(), 'uploads')

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

/**
 * GET /api/files/<category>/<filename>
 *
 * Сервит файлы из `apps/aboi/uploads/`. Кэш 1 год immutable —
 * файлы названы по cuid (`<id>.<ext>`), поэтому имя меняется при обновлении.
 *
 * Защита от path traversal: нормализуем путь и проверяем что он внутри UPLOADS_ROOT.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: parts } = await params
  const relPath = parts.join('/')
  const absPath = path.normalize(path.join(UPLOADS_ROOT, relPath))

  if (!absPath.startsWith(UPLOADS_ROOT + path.sep) && absPath !== UPLOADS_ROOT) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  let fileStat
  try {
    fileStat = await stat(absPath)
  } catch {
    return new NextResponse('Not found', { status: 404 })
  }

  if (!fileStat.isFile()) {
    return new NextResponse('Not found', { status: 404 })
  }

  const ext = path.extname(absPath).toLowerCase()
  const mime = MIME_BY_EXT[ext] ?? 'application/octet-stream'

  const stream = createReadStream(absPath)
  return new NextResponse(streamToWeb(stream), {
    headers: {
      'Content-Type': mime,
      'Content-Length': String(fileStat.size),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}

function streamToWeb(stream: ReadStream): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      stream.on('data', (chunk: string | Buffer) => {
        controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
      })
      stream.on('end', () => controller.close())
      stream.on('error', (err) => controller.error(err))
    },
    cancel() {
      stream.destroy()
    },
  })
}
