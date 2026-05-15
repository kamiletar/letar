/**
 * API: POST /api/analytics/env
 * Записывает Umami Website ID в .env.docker приложения на сервере
 * Маршрутизирует запрос: локальный сервер → nsenter, удалённый → dashboard-agent
 *
 * Body: { appName: string, websiteId: string }
 */

import { getServerSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { spawn } from 'node:child_process'

export const dynamic = 'force-dynamic'

const UMAMI_SCRIPT_URL = 'https://stats.letar.best/script.js'

/** Allow-list валидация пути для защиты от command injection */
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

/** Записать env через dashboard-agent на удалённом сервере */
async function writeEnvViaAgent(
  host: string,
  port: number,
  token: string,
  appName: string,
  websiteId: string
): Promise<{ success: boolean; error?: string }> {
  const url = `http://${host}:${port}/api/apps/${appName}/env`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ websiteId }),
    signal: AbortSignal.timeout(10000),
  })

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: `Agent error: ${res.status}` }))
    return { success: false, error: data.error || `Agent error: ${res.status}` }
  }

  return { success: true }
}

/** Записать env через nsenter на локальном сервере */
async function writeEnvLocal(appName: string, websiteId: string): Promise<{ success: boolean; error?: string }> {
  const workspaceDir = process.env.WORKSPACE_DIR || '/home/deploy/lena'

  if (!ALLOWED_WORKSPACES.includes(workspaceDir as (typeof ALLOWED_WORKSPACES)[number])) {
    return { success: false, error: 'Invalid workspace path' }
  }

  const envPath = `${workspaceDir}/apps/${appName}/.env.docker`

  // Проверить существование файла на хосте, создать если нет
  const checkResult = await runOnHost(`test -f '${envPath}' && echo 'exists'`)
  let content: string

  if (checkResult.stdout.includes('exists')) {
    const readResult = await runOnHost(`cat '${envPath}'`)
    if (readResult.code !== 0) {
      return { success: false, error: 'Не удалось прочитать .env.docker' }
    }
    content = readResult.stdout
  } else {
    // Проверить что директория приложения существует
    const appDir = `${workspaceDir}/apps/${appName}`
    const dirCheck = await runOnHost(`test -d '${appDir}' && echo 'exists'`)
    if (!dirCheck.stdout.includes('exists')) {
      return { success: false, error: `Директория apps/${appName} не найдена` }
    }
    content = ''
  }

  const scriptUrlLine = `NEXT_PUBLIC_UMAMI_SCRIPT_URL=${UMAMI_SCRIPT_URL}`
  const websiteIdLine = `NEXT_PUBLIC_UMAMI_WEBSITE_ID=${websiteId}`

  if (content.includes('NEXT_PUBLIC_UMAMI_WEBSITE_ID=')) {
    content = content.replace(/NEXT_PUBLIC_UMAMI_WEBSITE_ID=.*/, websiteIdLine)
  } else {
    const block = `\n# Umami Analytics\n${scriptUrlLine}\n${websiteIdLine}\n`
    content = content.trimEnd() + '\n' + block
  }

  if (content.includes('NEXT_PUBLIC_UMAMI_SCRIPT_URL=')) {
    content = content.replace(/NEXT_PUBLIC_UMAMI_SCRIPT_URL=.*/, scriptUrlLine)
  }

  const writeResult = await runOnHost(`cat > '${envPath}' << 'ENVEOF'\n${content}\nENVEOF`)
  if (writeResult.code !== 0) {
    console.error('[Analytics] nsenter write error:', writeResult.stderr)
    return { success: false, error: 'Не удалось записать в .env.docker' }
  }

  return { success: true }
}

export async function POST(request: NextRequest) {
  try {
    const { domain, websiteId } = await request.json()

    if (!domain || !websiteId) {
      return NextResponse.json({ error: 'domain и websiteId обязательны' }, { status: 400 })
    }

    if (!/^[a-f0-9-]+$/.test(websiteId)) {
      return NextResponse.json({ error: 'Некорректный websiteId' }, { status: 400 })
    }

    // Ищем приложение в БД по домену для определения сервера и имени директории
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const db = getEnhancedPrisma(session.user)
    const deployedApp = await db.deployedApp.findFirst({
      where: { domain },
      include: { server: { select: { id: true, host: true, port: true, isLocal: true, agentToken: true } } },
    })

    if (!deployedApp) {
      return NextResponse.json({ error: `Приложение с доменом ${domain} не найдено в БД` }, { status: 404 })
    }

    const appName = deployedApp.name
    let result: { success: boolean; error?: string }

    if (!deployedApp.server.isLocal && deployedApp.server.agentToken) {
      // Удалённый сервер — через dashboard-agent
      result = await writeEnvViaAgent(
        deployedApp.server.host,
        deployedApp.server.port,
        deployedApp.server.agentToken,
        appName,
        websiteId
      )
    } else {
      // Локальный сервер — через nsenter
      result = await writeEnvLocal(appName, websiteId)
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Analytics] Ошибка записи .env.docker:', error)
    return NextResponse.json({ error: 'Не удалось записать в .env.docker' }, { status: 500 })
  }
}
