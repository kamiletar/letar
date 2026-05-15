import { prismaAuth } from '@/lib/prisma'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { generateVerificationToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@letar/email'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

const ResendSchema = z.object({
  email: z.string().email('Некорректный email'),
})

export async function POST(request: Request) {
  try {
    // Rate limiting по IP
    const clientIp = getClientIp(request)
    const ipRateLimit = await checkRateLimit(clientIp, 'IP', 'verifyEmail')

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Слишком много попыток. Попробуйте позже.',
          blockedUntil: ipRateLimit.blockedUntil,
        },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Валидация данных
    const result = ResendSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Некорректный email' }, { status: 400 })
    }

    const { email } = result.data

    // Поиск пользователя
    const user = await prismaAuth.user.findUnique({
      where: { email },
    })

    // Не раскрываем существование пользователя (security best practice)
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message: 'Если пользователь с таким email существует, письмо было отправлено.',
        },
        { status: 200 }
      )
    }

    // Проверка - уже верифицирован? (Better Auth использует Boolean)
    if (user.emailVerified) {
      return NextResponse.json(
        {
          error: 'Email уже подтвержден. Вы можете войти в систему.',
        },
        { status: 400 }
      )
    }

    // Генерация нового токена (старый удаляется автоматически в generateVerificationToken)
    const verificationToken = await generateVerificationToken(email, 'EMAIL_VERIFICATION')

    // Отправка email через @letar/email
    const baseUrl = process.env.NEXTAUTH_URL || 'https://premium.rosstil.ru'
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken.value}`

    const emailResult = await sendVerificationEmail({
      to: email,
      verificationUrl,
      userName: user.name || 'Пользователь',
    })

    if (!emailResult.success) {
      console.error('[Resend Verification] Failed to send email:', emailResult.error)
      return NextResponse.json(
        {
          error: 'Не удалось отправить письмо. Попробуйте позже.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Письмо для подтверждения отправлено. Проверьте вашу почту.',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
