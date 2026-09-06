import { saveAudioFile } from '@/lib/audio/save-audio-file'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { saveUploadedFile } from '@/lib/files/save-uploaded-file'
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
 * POST /share — Web Share Target (Android "Поделиться" → сохранение в Kami).
 * Настроен в `manifest.ts` (`share_target`, enctype `multipart/form-data`).
 *
 * Три ветки в зависимости от того, что расшарено:
 * - файл `audio/*` → тот же пайплайн, что и ручная загрузка в `/admin/audio` (ID3-теги, обложка)
 * - любой другой файл (картинка, PDF) → `UploadedFile`, раздел `/admin/files`
 * - только текст/ссылка (файлов нет) → `Link`, раздел `/admin/links` (поведение до Фазы 10.х)
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

  const files = formData.getAll('files').filter((entry): entry is File => entry instanceof File && entry.size > 0)

  if (files.length > 0) {
    const hasAudio = files.some((file) => file.type.startsWith('audio/'))

    for (const file of files) {
      if (file.type.startsWith('audio/')) {
        await saveAudioFile(file, session.user.id, sharedTitle || null)
      } else {
        await saveUploadedFile(file, session.user.id, { description: sharedText || null })
      }
    }

    return NextResponse.redirect(new URL(hasAudio ? '/admin/audio' : '/admin/files', request.url), 303)
  }

  // Файлов нет — обычный шаринг ссылки
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
