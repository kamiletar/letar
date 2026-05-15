import { type NextRequest, NextResponse } from 'next/server'

/**
 * API route для внешнего редиректа
 * Используется чтобы не передавать ТИЦ/PageRank внешним сайтам
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')

  if (!url) {
    return NextResponse.json({ error: 'URL parameter is required' }, { status: 400 })
  }

  // Проверяем, что URL валидный
  try {
    const parsedUrl = new URL(url)
    // Используем parsedUrl для валидации
    if (!parsedUrl.protocol.startsWith('http')) {
      return NextResponse.json({ error: 'Invalid URL protocol' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Редирект на внешний URL
  return NextResponse.redirect(url, { status: 302 })
}
