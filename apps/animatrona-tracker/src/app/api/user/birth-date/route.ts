/**
 * API: POST /api/user/birth-date — Установить дату рождения
 *
 * Body: { birthDate: string (ISO 8601) }
 * Аутентификация: сессия
 */

import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

const BirthDateSchema = z
  .object({
    birthDate: z.iso.date(),
  })
  .strip()

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = BirthDateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Невалидная дата рождения' }, { status: 400 })
  }

  const birthDate = new Date(parsed.data.birthDate)

  // Валидация разумных границ
  const now = new Date()
  const minDate = new Date('1920-01-01')
  if (birthDate < minDate || birthDate > now) {
    return NextResponse.json({ error: 'Дата рождения вне допустимого диапазона' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { birthDate },
  })

  return NextResponse.json({ ok: true })
}
