import { revalidatePath } from 'next/cache'
import type { NextRequest } from 'next/server'

/**
 * API endpoint для принудительной ревалидации кэша
 *
 * Использование:
 *   POST https://animatrona.letar.best/api/revalidate?secret=YOUR_SECRET
 *
 * Вызывается из GitHub Actions после публикации релиза
 * для мгновенного обновления changelog на лендинге
 */
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  // Проверка секретного ключа
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: 'Invalid secret' }, { status: 401 })
  }

  try {
    // Ревалидируем главную страницу (где changelog)
    revalidatePath('/')

    return Response.json({
      revalidated: true,
      timestamp: Date.now(),
      message: 'Cache revalidated successfully',
    })
  } catch (error) {
    return Response.json(
      {
        error: 'Revalidation failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    )
  }
}
