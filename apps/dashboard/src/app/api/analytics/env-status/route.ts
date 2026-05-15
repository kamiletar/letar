/**
 * API: GET /api/analytics/env-status?domains=domain1,domain2
 * Проверяет наличие NEXT_PUBLIC_UMAMI_WEBSITE_ID в .env.docker для каждого приложения.
 * Матчит по домену: Umami domain → DeployedApp.domain → DeployedApp.name (директория).
 * Маршрутизирует: локальные → nsenter, удалённые → dashboard-agent.
 * Возвращает { data: { "domain1": true, "domain2": false, ... } }
 */

import { getServerSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { spawn } from 'node:child_process'

export const dynamic = 'force-dynamic'

const ALLOWED_WORKSPACES = ['/web/lena', '/home/deploy/lena'] as const

/** Выполняет команду на хосте через nsenter */
async function runOnHost(command: string): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    const proc = spawn('nsenter', ['-t', '1', '-m', '-u', '-i', '-n', '-p', '--', 'sh', '-c', command], {
      stdio: 'pipe',
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    proc.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    proc.on('close', (code) => {
      resolve({ stdout, stderr, code: code || 0 })
    })

    proc.on('error', (err) => {
      resolve({ stdout: '', stderr: err.message, code: 1 })
    })

    setTimeout(() => {
      proc.kill()
      resolve({ stdout, stderr: stderr + '\nTimeout', code: 1 })
    }, 10000)
  })
}

/** Проверить env через dashboard-agent на удалённом сервере */
async function checkEnvViaAgent(
  host: string,
  port: number,
  token: string,
  apps: string[]
): Promise<Record<string, boolean>> {
  try {
    const url = `http://${host}:${port}/api/env-status?apps=${apps.join(',')}`
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    })
    if (!res.ok) {
      return {}
    }
    const data = await res.json()
    return data.data ?? {}
  } catch {
    return {}
  }
}

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

    // Валидация доменов: буквы, цифры, точки, дефисы, кириллица (IDN)
    const domains = domainsParam.split(',').filter((d) => d.length > 0 && d.length < 253)
    if (domains.length === 0) {
      return NextResponse.json({ data: {} })
    }

    // Загрузить DeployedApp по домену — получаем name (директорию) и server
    const db = getEnhancedPrisma(session.user)
    const deployedApps = await db.deployedApp.findMany({
      where: { domain: { in: domains } },
      select: {
        name: true,
        domain: true,
        server: { select: { host: true, port: true, isLocal: true, agentToken: true } },
      },
    })

    // domain → { appName, server }
    const domainMap = new Map(deployedApps.map((a) => [a.domain!, { name: a.name, server: a.server }]))

    // Группируем: локальные vs удалённые
    const localApps: { domain: string; name: string }[] = []
    const remoteGroups = new Map<
      string,
      { host: string; port: number; token: string; apps: { domain: string; name: string }[] }
    >()

    for (const domain of domains) {
      const app = domainMap.get(domain)
      if (!app || app.server.isLocal || !app.server.agentToken) {
        if (app) {
          localApps.push({ domain, name: app.name })
        }
        // Домен не найден в БД — пропускаем (нет DeployedApp записи)
      } else {
        const key = `${app.server.host}:${app.server.port}`
        const group = remoteGroups.get(key)
        if (group) {
          group.apps.push({ domain, name: app.name })
        } else {
          remoteGroups.set(key, {
            host: app.server.host,
            port: app.server.port,
            token: app.server.agentToken,
            apps: [{ domain, name: app.name }],
          })
        }
      }
    }

    // Результат: domain → boolean
    const status: Record<string, boolean> = {}

    // Проверить локальные через nsenter
    if (localApps.length > 0) {
      const workspaceDir = process.env.WORKSPACE_DIR || '/home/deploy/lena'
      if (ALLOWED_WORKSPACES.includes(workspaceDir as (typeof ALLOWED_WORKSPACES)[number])) {
        const checks = localApps
          .map(
            (app) =>
              `grep -q 'NEXT_PUBLIC_UMAMI_WEBSITE_ID=' '${workspaceDir}/apps/${app.name}/.env.docker' 2>/dev/null && echo "Y:${app.name}" || echo "N:${app.name}"`
          )
          .join('; ')

        const result = await runOnHost(checks)
        for (const app of localApps) {
          status[app.domain] = result.stdout.includes(`Y:${app.name}`)
        }
      }
    }

    // Проверить удалённые через dashboard-agent (параллельно)
    // Agent принимает имена приложений (директории), возвращает { name: boolean }
    const remotePromises = Array.from(remoteGroups.values()).map(async (group) => {
      const appNames = group.apps.map((a) => a.name)
      const remoteStatus = await checkEnvViaAgent(group.host, group.port, group.token, appNames)
      // Конвертируем name → domain в результате
      for (const app of group.apps) {
        status[app.domain] = remoteStatus[app.name] ?? false
      }
    })
    await Promise.all(remotePromises)

    return NextResponse.json({ data: status })
  } catch (error) {
    console.error('[Analytics] env-status error:', error)
    return NextResponse.json({ data: {} })
  }
}
