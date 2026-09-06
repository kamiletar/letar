import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/** Извлекает первый http(s)-URL из произвольного текста */
function extractUrl(text: string): string | null {
  const match = text.match(/https?:\/\/[^\s]+/)
  return match ? match[0] : null
}

/** Best-effort получение `<title>` страницы по ссылке — тихо игнорирует любые ошибки */
async function fetchPageTitle(url: string): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const response = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!response.ok) {
      return null
    }
    const html = await response.text()
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i)
    return match ? match[1].trim() || null : null
  } catch {
    return null
  }
}

/**
 * POST /share — Web Share Target (Android "Поделиться" → сохранение ссылки в Kami).
 * Настроен в `manifest.ts` (`share_target`, enctype `application/x-www-form-urlencoded`).
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user || !session.user.roles?.includes('ADMIN')) {
    return NextResponse.redirect(new URL('/auth/signin', request.url), 303)
  }

  const formData = await request.formData()
  const sharedTitle = (formData.get('title') as string | null)?.trim() || ''
  const sharedText = (formData.get('text') as string | null)?.trim() || ''
  const sharedUrl = (formData.get('url') as string | null)?.trim() || ''

  // Android иногда кладёт URL в text, а не в url
  const url = sharedUrl || extractUrl(sharedText) || extractUrl(sharedTitle)
  if (!url) {
    return NextResponse.redirect(new URL('/admin/links?error=no-url', request.url), 303)
  }

  const title = sharedTitle || (await fetchPageTitle(url)) || url

  const db = getEnhancedPrisma(session.user)
  const link = await db.link.create({
    data: {
      url,
      title,
      description: sharedText && sharedText !== url ? sharedText : null,
    },
  })

  return NextResponse.redirect(new URL(`/admin/links?created=${link.id}`, request.url), 303)
}
