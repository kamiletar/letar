import { prisma } from '@/lib/prisma'
import { type NextRequest, NextResponse } from 'next/server'
import { createHmac } from 'node:crypto'

/**
 * Facebook Data Deletion Callback
 *
 * Facebook отправляет POST-запрос когда пользователь удаляет приложение.
 * Мы удаляем данные пользователя и возвращаем URL для проверки статуса.
 *
 * @see https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const signedRequest = formData.get('signed_request') as string | null

    if (!signedRequest) {
      return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 })
    }

    const appSecret = process.env.AUTH_FACEBOOK_SECRET
    if (!appSecret) {
      return NextResponse.json({ error: 'Facebook not configured' }, { status: 500 })
    }

    // Парсим и проверяем signed_request от Facebook
    const data = parseSignedRequest(signedRequest, appSecret)
    if (!data) {
      return NextResponse.json({ error: 'Invalid signed_request' }, { status: 400 })
    }

    const facebookUserId = data.user_id as string
    if (!facebookUserId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 })
    }

    // Генерируем код подтверждения
    const confirmationCode = generateConfirmationCode()

    // Удаляем аккаунт Facebook из нашей БД
    await deleteUserFacebookData(facebookUserId)

    // URL для проверки статуса
    const baseUrl = process.env.BETTER_AUTH_URL || 'https://kami.letar.best'
    const statusUrl = `${baseUrl}/data-deletion?code=${confirmationCode}`

    return NextResponse.json({
      url: statusUrl,
      confirmation_code: confirmationCode,
    })
  } catch (error) {
    console.error('[Facebook Data Deletion] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * Парсит и верифицирует signed_request от Facebook
 */
function parseSignedRequest(signedRequest: string, secret: string): Record<string, unknown> | null {
  const [encodedSig, payload] = signedRequest.split('.')
  if (!encodedSig || !payload) {
    return null
  }

  // Декодируем подпись
  const sig = Buffer.from(encodedSig.replace(/-/g, '+').replace(/_/g, '/'), 'base64')

  // Вычисляем ожидаемую подпись
  const expectedSig = createHmac('sha256', secret).update(payload).digest()

  // Сравниваем подписи (timing-safe)
  if (sig.length !== expectedSig.length || !sig.equals(expectedSig)) {
    console.error('[Facebook Data Deletion] Invalid signature')
    return null
  }

  // Декодируем payload
  const decoded = Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')

  return JSON.parse(decoded)
}

/**
 * Генерирует уникальный код подтверждения удаления
 */
function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let code = ''
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  for (const byte of bytes) {
    code += chars[byte % chars.length]
  }
  return code
}

/**
 * Удаляет данные Facebook-аккаунта пользователя
 */
async function deleteUserFacebookData(facebookUserId: string) {
  // Находим привязанный аккаунт
  const account = await prisma.account.findFirst({
    where: {
      providerId: 'facebook',
      accountId: facebookUserId,
    },
  })

  if (!account) {
    console.warn(`[Facebook Data Deletion] No account found for Facebook user ${facebookUserId}`)
    return
  }

  // Удаляем привязку Facebook аккаунта
  await prisma.account.delete({
    where: { id: account.id },
  })

  console.warn(`[Facebook Data Deletion] Deleted Facebook account link for user ${account.userId}`)
}
