/**
 * API: GET/PATCH /api/profile/settings — Настройки пользователя
 *
 * Аутентификация: API Key (Bearer) или сессия
 */

import { verifyApiKey } from '@/lib/api-auth'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

/**
 * GET /api/profile/settings
 * Получить настройки пользователя
 */
export async function GET(request: NextRequest) {
  // Аутентификация: API Key или сессия
  const apiKeyUser = await verifyApiKey(request)
  const session = apiKeyUser ? null : await getSession()
  const authedUser = apiKeyUser ?? session?.user

  if (!authedUser) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }

  const db = getEnhancedPrisma(authedUser)

  const userData = await db.user.findUnique({
    where: { id: authedUser.id },
    select: { name: true, image: true, customGateway: true, preferredTrackMode: true },
  })

  return NextResponse.json({ data: userData })
}

const SettingsSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  image: z.string().url().nullable().optional(),
  customGateway: z.string().url().nullable().optional(),
  preferredTrackMode: z.enum(['RUSSIAN_DUB', 'ORIGINAL_SUB']).optional(),
})

/**
 * PATCH /api/profile/settings
 * Обновить настройки пользователя
 */
export async function PATCH(request: NextRequest) {
  // Аутентификация: API Key или сессия
  const apiKeyUser = await verifyApiKey(request)
  const session = apiKeyUser ? null : await getSession()
  const authedUser = apiKeyUser ?? session?.user

  if (!authedUser) {
    return NextResponse.json({ error: 'Необходима авторизация' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = SettingsSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const db = getEnhancedPrisma(authedUser)

  const data: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) {
    data.name = parsed.data.name
  }
  if (parsed.data.image !== undefined) {
    data.image = parsed.data.image
  }
  if (parsed.data.customGateway !== undefined) {
    data.customGateway = parsed.data.customGateway
  }
  if (parsed.data.preferredTrackMode !== undefined) {
    data.preferredTrackMode = parsed.data.preferredTrackMode
  }

  const user = await db.user.update({
    where: { id: authedUser.id },
    data,
    select: { id: true, name: true, image: true, customGateway: true, preferredTrackMode: true },
  })

  return NextResponse.json({ data: user })
}
