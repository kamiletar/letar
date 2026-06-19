/**
 * API: GET /api/analytics/env-status?domains=domain1,domain2
 * Проверяет наличие umamiWebsiteId в DeployedApp для каждого домена.
 * Раньше читало .env.docker через nsenter/agent — теперь источник истины это БД.
 * Возвращает { data: { "domain1": true, "domain2": false, ... } }
 */

import { getServerSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const domainsParam = request.nextUrl.searchParams.get('domains')
    if (!domainsParam) {
      return NextResponse.json({ error: 'Параметр domains обязателен' }, { status: 400 })
    }

    const domains = domainsParam.split(',').filter((d) => d.length > 0 && d.length < 253)
    if (domains.length === 0) {
      return NextResponse.json({ data: {} })
    }

    const db = getEnhancedPrisma(session.user)
    const apps = await db.deployedApp.findMany({
      where: { domain: { in: domains } },
      select: { domain: true, umamiWebsiteId: true },
    })

    const status: Record<string, boolean> = {}
    for (const domain of domains) {
      status[domain] = false
    }
    for (const app of apps) {
      if (app.domain) {
        status[app.domain] = !!app.umamiWebsiteId
      }
    }

    return NextResponse.json({ data: status })
  } catch (error) {
    console.error('[Analytics] env-status error:', error)
    return NextResponse.json({ data: {} })
  }
}
