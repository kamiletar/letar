/**
 * API для сервинга загруженных файлов из uploads/.
 * Next.js копирует public/ при билде — динамические файлы недоступны,
 * поэтому сервим через API route с кэшированием.
 */

import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { join } from 'path'

const mimeTypes: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const { path } = await params

    // Защита от traversal-атак
    if (path.some((segment) => segment.includes('..') || segment.includes('/'))) {
      return new NextResponse('Invalid path', { status: 400 })
    }

    const filepath = join(process.cwd(), 'uploads', ...path)

    if (!existsSync(filepath)) {
      return new NextResponse('File not found', { status: 404 })
    }

    const file = await readFile(filepath)

    const ext = path[path.length - 1].split('.').pop()?.toLowerCase()
    const contentType = ext ? mimeTypes[ext] || 'application/octet-stream' : 'application/octet-stream'

    return new NextResponse(file, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (error) {
    console.error('[Files API] Error:', error)
    return new NextResponse('Internal server error', { status: 500 })
  }
}
