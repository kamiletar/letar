/**
 * API: POST /api/servers/[id]/apps/[appId]/deploy
 * Деплой приложения через deploy-affected.sh (удалённые серверы)
 * или docker pull + restart (локальный сервер)
 */

import { getServerSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { findContainerByName } from '@/lib/server-client'
import { getClientByServerId } from '@/lib/server-client/get-client-by-id'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type Params = Promise<{ id: string; appId: string }>

/**
 * POST /api/servers/[id]/apps/[appId]/deploy
 * Для удалённых серверов: deploy-affected.sh --app <appName>
 * Для локального сервера: docker pull + restart
 */
export async function POST(_request: Request, { params }: { params: Params }) {
  try {
    const { id, appId } = await params
    const session = await getServerSession()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const db = getEnhancedPrisma(session.user)

    // Получаем приложение с информацией о сервере
    const app = await db.deployedApp.findFirst({
      where: { id: appId, serverId: id },
      include: {
        server: {
          select: {
            id: true,
            name: true,
            isLocal: true,
          },
        },
      },
    })

    if (!app) {
      return NextResponse.json({ error: 'App not found' }, { status: 404 })
    }

    // Получаем клиент для сервера
    const { client, server } = await getClientByServerId(id)

    const logs: string[] = []

    // Для удалённых серверов с agent — используем deploy-affected.sh
    // Деплой теперь асинхронный — сразу возвращаем ответ, логи через polling
    if (!server?.isLocal && client.deployApp) {
      logs.push(`Deploying ${app.name} via deploy-affected.sh...`)

      try {
        const result = await client.deployApp(app.name)

        // Обновляем lastDeployed сразу при запуске
        await db.deployedApp.update({
          where: { id: appId },
          data: { lastDeployed: new Date() },
        })

        // Возвращаем сразу — деплой запущен
        return NextResponse.json({
          success: true,
          message: 'Deploy started',
          started: result.started,
          logs,
          lastDeployed: new Date().toISOString(),
        })
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: `Deploy failed: ${errorMsg}`, logs }, { status: 500 })
      }
    } else {
      // Для локального сервера — docker pull + restart
      if (!app.containerName) {
        return NextResponse.json({ error: 'Container name not specified for this app' }, { status: 400 })
      }

      // Находим контейнер по имени (точное совпадение или префикс <name>- —
      // rollout-мигрированные приложения без container_name, §18.6)
      const containers = await client.getContainers(true)
      const container = findContainerByName(containers, app.containerName)

      if (!container) {
        return NextResponse.json({ error: `Container "${app.containerName}" not found on server` }, { status: 404 })
      }

      // Шаг 1: Docker pull (если указан образ)
      if (app.imageName) {
        logs.push(`Pulling image: ${app.imageName}`)
        try {
          await client.pullImage(app.imageName)
          logs.push(`Image pulled successfully`)
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error'
          logs.push(`Warning: Failed to pull image: ${errorMsg}`)
        }
      }

      // Шаг 2: Restart контейнера
      logs.push(`Restarting container: ${app.containerName}`)
      try {
        await client.controlContainer(container.id, 'restart')
        logs.push(`Container restarted successfully`)
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error'
        return NextResponse.json({ error: `Failed to restart container: ${errorMsg}`, logs }, { status: 500 })
      }
    }

    // Обновляем lastDeployed
    await db.deployedApp.update({
      where: { id: appId },
      data: { lastDeployed: new Date() },
    })

    return NextResponse.json({
      success: true,
      message: 'Deploy completed successfully',
      logs,
      lastDeployed: new Date().toISOString(),
    })
  } catch (error) {
    console.error('[API] Error deploying app:', error)
    const errorMsg = error instanceof Error ? error.message : 'Internal server error'
    return NextResponse.json({ error: errorMsg }, { status: 500 })
  }
}
