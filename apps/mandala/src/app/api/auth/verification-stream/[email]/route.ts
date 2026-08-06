import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Polling endpoint для проверки статуса верификации email.
 *
 * ОПТИМИЗАЦИЯ ПАМЯТИ:
 * Ранее использовался SSE с setInterval на сервере — каждый клиент
 * создавал интервал и держал открытое соединение (при 100 клиентах = 100 интервалов).
 *
 * Теперь клиент сам опрашивает этот endpoint через setInterval на своей стороне.
 * Сервер просто отвечает на запрос и освобождает ресурсы.
 *
 * Использование на клиенте:
 * ```ts
 * const checkVerification = async () => {
 *   const res = await fetch(`/api/auth/verification-stream/${email}`)
 *   const { verified } = await res.json()
 *   if (verified) {
 *     // Редирект или обновление UI
 *   }
 * }
 * const interval = setInterval(checkVerification, 2000)
 * // Не забыть clearInterval при unmount
 * ```
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ email: string }> }) {
  const { email } = await params
  const decodedEmail = decodeURIComponent(email)

  try {
    const user = await prisma.user.findUnique({
      where: { email: decodedEmail },
      select: { emailVerified: true },
    })

    return NextResponse.json(
      { verified: !!user?.emailVerified },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      },
    )
  } catch {
    return NextResponse.json({ verified: false, error: 'Database error' }, { status: 500 })
  }
}
