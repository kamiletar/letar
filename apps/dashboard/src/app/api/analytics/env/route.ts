/**
 * API: POST /api/analytics/env
 * Сохраняет Umami Website ID в DeployedApp.umamiWebsiteId (БД дашборда).
 * Раньше писало в .env.docker на сервере — теперь БД является источником истины.
 *
 * Body: { domain: string, websiteId: string }
 */

import { getServerSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { domain, websiteId } = await request.json()

    if (!domain || !websiteId) {
      return NextResponse.json({ error: 'domain и websiteId обязательны' }, { status: 400 })
    }

    if (!/^[a-f0-9-]+$/.test(websiteId)) {
      return NextResponse.json({ error: 'Некорректный websiteId' }, { status: 400 })
    }

    const db = getEnhancedPrisma(session.user)

    const app = await db.deployedApp.findFirst({ where: { domain } })
    if (!app) {
      return NextResponse.json({ error: `Приложение с доменом ${domain} не найдено в БД` }, { status: 404 })
    }

    await db.deployedApp.update({
      where: { id: app.id },
      data: { umamiWebsiteId: websiteId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Analytics] Ошибка сохранения umamiWebsiteId:', error)
    return NextResponse.json({ error: 'Не удалось сохранить website ID' }, { status: 500 })
  }
}
