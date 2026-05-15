import { ResetPasswordSchema } from '@/app/[locale]/auth/_schemas/email-auth.schema'
import { prismaAuth } from '@/lib/prisma'
import { deleteToken, verifyToken } from '@/lib/tokens'
import { hash } from 'bcryptjs'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Валидация
    const result = ResetPasswordSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: 'Некорректные данные', details: result.error.flatten() }, { status: 400 })
    }

    const { token, password } = result.data

    // Проверка токена
    const tokenResult = await verifyToken(token, 'PASSWORD_RESET')

    if (tokenResult.error) {
      return NextResponse.json({ error: tokenResult.error }, { status: 400 })
    }

    const email = tokenResult.identifier

    // Хеширование нового пароля
    const hashedPassword = await hash(password, 12)

    // Находим пользователя
    const user = await prismaAuth.user.findUnique({
      where: { email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 })
    }

    // Обновление пароля в Account (Better Auth хранит пароль в Account)
    await prismaAuth.account.updateMany({
      where: {
        userId: user.id,
        providerId: 'credential',
      },
      data: { password: hashedPassword },
    })

    // Удаление использованного токена
    await deleteToken(token)

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменен. Войдите используя новый пароль.',
    })
  } catch (error) {
    console.error('[Password Reset] Error:', error)
    return NextResponse.json({ error: 'Не удалось сбросить пароль' }, { status: 500 })
  }
}
