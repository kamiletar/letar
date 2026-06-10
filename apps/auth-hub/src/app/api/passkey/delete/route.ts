import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { headers } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { passkeyId: string }
  try {
    body = (await request.json()) as { passkeyId: string }
  } catch {
    return NextResponse.json({ error: 'Неверный запрос' }, { status: 400 })
  }

  if (!body.passkeyId) {
    return NextResponse.json({ error: 'passkeyId обязателен' }, { status: 400 })
  }

  // Проверяем что ключ принадлежит текущему пользователю
  const passkey = await prisma.passkey.findFirst({
    where: { id: body.passkeyId, userId: session.user.id },
    select: { id: true },
  })

  if (!passkey) {
    return NextResponse.json({ error: 'Passkey не найден' }, { status: 404 })
  }

  await prisma.passkey.delete({ where: { id: body.passkeyId } })

  return NextResponse.json({ deleted: true })
}
