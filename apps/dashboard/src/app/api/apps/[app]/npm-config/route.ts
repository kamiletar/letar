import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/db'
import { getClientByServerId } from '@/lib/server-client/get-client-by-id'

export const dynamic = 'force-dynamic'

type Params = Promise<{ app: string }>

/**
 * GET /api/apps/[app]/npm-config?serverId=...
 * Возвращает конфигурацию приложения для создания proxy host в NPM.
 * Данные берутся из БД (DeployedApp), для удалённых серверов проксируется к dashboard-agent.
 */
export async function GET(request: NextRequest, { params }: { params: Params }) {
  const { app } = await params
  const serverId = request.nextUrl.searchParams.get('serverId')

  // Удалённый сервер — проксируем к dashboard-agent
  if (serverId) {
    try {
      const { client, server } = await getClientByServerId(serverId)

      if (server) {
        const data =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- dashboard-agent клиент может не иметь fetchRaw в типах
          (await (client as any).fetchRaw?.(`/api/apps/${app}/npm-config`))
            ?? (await fetchFromAgent(server.host, server.port, server.agentToken ?? '', app))

        return NextResponse.json({ success: true, data })
      }
    } catch (error) {
      console.error(`Error fetching npm-config from remote agent for app ${app}:`, error)
      // Fallback к локальной конфигурации из БД
    }
  }

  // Локальная конфигурация из БД (DeployedApp)
  try {
    const deployedApp = await prisma.deployedApp.findFirst({
      where: { name: app },
      select: {
        name: true,
        containerName: true,
        port: true,
        domain: true,
      },
    })

    if (!deployedApp) {
      return NextResponse.json({ success: false, error: `Приложение «${app}» не найдено в реестре` }, { status: 404 })
    }

    // Разбиваем domain на массив (может содержать несколько через запятую)
    const domains = (deployedApp.domain ?? '')
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean)

    return NextResponse.json({
      success: true,
      data: {
        name: deployedApp.name,
        containerName: deployedApp.containerName ?? `${app}-app`,
        port: deployedApp.port ?? 3000,
        domains,
      },
    })
  } catch (error) {
    console.error(`Error getting NPM config for app ${app}:`, error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}

/** Прямой запрос к dashboard-agent без ServerClient */
async function fetchFromAgent(host: string, port: number, token: string, app: string) {
  const url = `http://${host}:${port}/api/apps/${app}/npm-config`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(5000),
  })
  if (!res.ok) {
    throw new Error(`Agent responded with ${res.status}`)
  }
  const json = await res.json()
  if (!json.success) {
    throw new Error(json.error ?? 'Unknown agent error')
  }
  return json.data
}
