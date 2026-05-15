import { RequestPasswordResetSchema } from '@/app/[locale]/auth/_schemas/email-auth.schema'
import { logger } from '@/lib/logger'
import { prismaAuth } from '@/lib/prisma'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { generateVerificationToken } from '@/lib/tokens'
import { sendPasswordResetEmail } from '@letar/email'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Rate limiting по IP
    const clientIp = getClientIp(request)
    const ipRateLimit = await checkRateLimit(clientIp, 'IP', 'resetPassword')

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Слишком много попыток сброса пароля. Попробуйте позже.',
          blockedUntil: ipRateLimit.blockedUntil,
        },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Валидация
    const result = RequestPasswordResetSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Некорректный email адрес' }, { status: 400 })
    }

    const { email } = result.data

    // Проверка существования пользователя
    const user = await prismaAuth.user.findUnique({
      where: { email },
    })

    // Всегда возвращаем успех, даже если пользователь не найден (защита от перебора email)
    if (!user) {
      logger.info('[Password Reset] User not found:', email)
      return NextResponse.json({
        success: true,
        message: 'Если пользователь с таким email существует, на него отправлено письмо с инструкциями.',
      })
    }

    // Генерация токена сброса
    const resetToken = await generateVerificationToken(email, 'PASSWORD_RESET')

    // Отправка email через @letar/email
    const baseUrl = process.env.NEXTAUTH_URL || 'https://premium.rosstil.ru'
    const resetUrl = `${baseUrl}/auth/reset-password?token=${resetToken.value}`

    const emailResult = await sendPasswordResetEmail({
      to: email,
      resetUrl,
      userName: user.name || undefined,
    })

    if (!emailResult.success) {
      logger.error('[Password Reset] Failed to send email:', emailResult.error)
      return NextResponse.json({ error: 'Не удалось отправить email. Попробуйте позже.' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Если пользователь с таким email существует, на него отправлено письмо с инструкциями.',
    })
  } catch (error) {
    logger.error('[Password Reset] Error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
