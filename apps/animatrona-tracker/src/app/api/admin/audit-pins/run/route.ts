/**
 * POST /api/admin/audit-pins/run — Запуск фонового аудита пинов
 *
 * Создаёт фоновую задачу: сбор CIDs → fetch pins → diff → unpin → GC → обновление stats.
 * Возвращает jobId мгновенно, без ожидания завершения.
 *
 * Query: ?serverId=xxx (обязательно)
 *
 * Только для ADMIN.
 */

import { isAuthError, requireAdmin } from '@/lib/admin-auth'
import { collectAllReferencedCids } from '@/lib/audit-cid-collector'
import {
  addJobError,
  type AuditJob,
  completeJob,
  createAuditJob,
  failJob,
  getActiveJobForServer,
  updateJobPhase,
  updateJobProgress,
} from '@/lib/audit-job-store'
import { getKuboPins, type PinServerInfo, unpinCid } from '@/lib/audit-pins-utils'
import { prisma } from '@/lib/db'
import { kuboRepoGc, kuboRepoStat } from '@/lib/pinning'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/** Фоновый воркер аудита — fire-and-forget */
async function runAuditJob(job: AuditJob, server: PinServerInfo & { id: string }): Promise<void> {
  try {
    // Запоминаем текущий usedBytes для подсчёта освобождённого места
    const serverRecord = await prisma.pinServer.findUnique({
      where: { id: server.id },
      select: { usedBytes: true },
    })
    const oldUsedBytes = serverRecord?.usedBytes ?? BigInt(0)

    // Фаза 1: Сбор всех referenced CIDs
    updateJobPhase(job, 'collecting_cids', 'Сбор CIDs из БД и IPFS манифестов...')
    const referencedCids = await collectAllReferencedCids(job)
    job.result.referencedCidsCount = referencedCids.size

    // Фаза 2: Получение пинов с сервера
    updateJobPhase(job, 'fetching_pins', 'Загрузка списка пинов с Kubo...')
    const kuboPins = await getKuboPins(server.apiUrl, server.authSecret)
    job.result.pinnedCidsCount = kuboPins.length
    updateJobProgress(job, kuboPins.length, kuboPins.length, `${kuboPins.length} пинов`)

    // Фаза 3: Сравнение
    updateJobPhase(job, 'comparing', 'Определение сиротских пинов...')
    const orphaned = kuboPins.filter((cid) => !referencedCids.has(cid))
    job.result.orphanedCount = orphaned.length
    updateJobProgress(job, orphaned.length, orphaned.length, `${orphaned.length} сиротских из ${kuboPins.length}`)

    // Фаза 4: Последовательный unpin (HDD — параллельный убьёт диск)
    if (orphaned.length > 0) {
      updateJobPhase(job, 'unpinning', `Распиновка ${orphaned.length} сиротских CIDs...`)
      for (let i = 0; i < orphaned.length; i++) {
        updateJobProgress(job, i + 1, orphaned.length, orphaned[i]!.slice(0, 20) + '...')
        const result = await unpinCid(orphaned[i]!, server)
        if (result.success) {
          job.result.unpinnedCount++
        } else {
          addJobError(job, `${orphaned[i]}: ${result.error}`)
        }
      }
    }

    // Фаза 5: Garbage Collection
    updateJobPhase(job, 'gc', 'Garbage collection на Kubo (может занять 10-30 мин)...')
    updateJobProgress(job, 0, 1, 'repo/gc...')
    const gcResult = await kuboRepoGc(server.apiUrl, server.authSecret)
    if (!gcResult.success) {
      addJobError(job, `GC error: ${gcResult.error}`)
    }
    updateJobProgress(job, 1, 1, gcResult.success ? 'GC завершён' : `GC ошибка: ${gcResult.error}`)

    // Фаза 6: Обновление статистики
    updateJobPhase(job, 'updating_stats', 'Обновление размера репозитория...')
    const stat = await kuboRepoStat(server.apiUrl, server.authSecret, 30_000)
    if (stat.repoSize !== undefined && stat.repoSize !== null) {
      await prisma.pinServer.update({
        where: { id: server.id },
        data: { usedBytes: BigInt(stat.repoSize) },
      })
      const freed = Number(oldUsedBytes) - stat.repoSize
      job.result.freedBytes = Math.max(0, freed)
    }

    completeJob(job)
  } catch (err) {
    failJob(job, err instanceof Error ? err.message : 'Неизвестная ошибка')
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const { searchParams } = request.nextUrl
  const serverId = searchParams.get('serverId')

  if (!serverId) {
    return NextResponse.json({ error: 'serverId обязателен' }, { status: 400 })
  }

  // Проверяем что нет активной задачи для этого сервера
  const activeJob = getActiveJobForServer(serverId)
  if (activeJob) {
    return NextResponse.json({ error: 'Аудит уже запущен для этого сервера', jobId: activeJob.id }, { status: 409 })
  }

  // Загружаем сервер
  const server = await prisma.pinServer.findUnique({
    where: { id: serverId },
    select: {
      id: true,
      name: true,
      apiUrl: true,
      authSecret: true,
      pinQueueUrl: true,
      pinQueueSecret: true,
    },
  })

  if (!server) {
    return NextResponse.json({ error: 'Сервер не найден' }, { status: 404 })
  }

  // Создаём задачу и запускаем в фоне
  const job = createAuditJob(server.id, server.name)

  // Fire-and-forget — НЕ await (паттерн из pin-jobs/failed/route.ts)
  void runAuditJob(job, server)

  return NextResponse.json({
    jobId: job.id,
    serverId: server.id,
    serverName: server.name,
  })
}
