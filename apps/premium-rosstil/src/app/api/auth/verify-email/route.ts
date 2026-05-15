export const dynamic = 'force-dynamic'

import { prismaAuth } from '@/lib/prisma'
import { deleteToken, verifyToken } from '@/lib/tokens'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Токен не указан' }, { status: 400 })
  }

  // Проверка токена
  const result = await verifyToken(token, 'EMAIL_VERIFICATION')

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 })
  }

  const email = result.identifier

  // Обновление пользователя (Better Auth использует Boolean для emailVerified)
  try {
    await prismaAuth.user.update({
      where: { email },
      data: { emailVerified: true },
    })

    // Удаление использованного токена
    await deleteToken(token)

    return NextResponse.json({
      success: true,
      message: 'Email успешно подтвержден',
    })
  } catch (error) {
    console.error('[Email Verification] Failed to verify email:', error)
    return NextResponse.json({ error: 'Не удалось подтвердить email' }, { status: 500 })
  }
}
