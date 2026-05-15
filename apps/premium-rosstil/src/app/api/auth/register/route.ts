import { RegisterSchema } from '@/app/[locale]/auth/_schemas/email-auth.schema'
import { prismaAuth } from '@/lib/prisma'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { generateVerificationToken } from '@/lib/tokens'
import { sendVerificationEmail } from '@letar/email'
import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Rate limiting по IP
    const clientIp = getClientIp(request)
    const ipRateLimit = await checkRateLimit(clientIp, 'IP', 'register')

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Слишком много попыток регистрации. Попробуйте позже.',
          blockedUntil: ipRateLimit.blockedUntil,
        },
        { status: 429 }
      )
    }

    const body = await request.json()

    // Валидация данных
    const result = RegisterSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Некорректные данные', details: result.error.flatten() }, { status: 400 })
    }

    const { name, email, password } = result.data

    // Проверка существования пользователя
    const existingUser = await prismaAuth.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 409 })
    }

    // Хеширование пароля
    const hashedPassword = await hash(password, 12)

    // Создание пользователя и аккаунта в транзакции (Better Auth схема)
    const user = await prismaAuth.$transaction(async (tx) => {
      // Создаём пользователя
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          emailVerified: false, // Better Auth использует Boolean
        },
      })

      // Создаём Account с паролем (Better Auth хранит пароль в Account)
      await tx.account.create({
        data: {
          userId: newUser.id,
          providerId: 'credential',
          accountId: email,
          password: hashedPassword,
        },
      })

      return newUser
    })

    // Генерация токена верификации
    const verificationToken = await generateVerificationToken(email, 'EMAIL_VERIFICATION')

    // Отправка email с токеном через @letar/email
    const baseUrl = process.env.NEXTAUTH_URL || 'https://premium.rosstil.ru'
    const verificationUrl = `${baseUrl}/auth/verify-email?token=${verificationToken.value}`

    const emailResult = await sendVerificationEmail({
      to: email,
      verificationUrl,
      userName: name,
    })

    if (!emailResult.success) {
      console.error('[Registration] Failed to send verification email:', emailResult.error)
      // Не блокируем регистрацию, но логируем ошибку
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Регистрация успешна. Проверьте ваш email для подтверждения адреса.',
        userId: user.id,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    return NextResponse.json({ error: 'Внутренняя ошибка сервера' }, { status: 500 })
  }
}
