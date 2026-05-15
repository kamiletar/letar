/**
 * POST /api/admin/cleanup-old-pins
 *
 * Очистка устаревших пинов. Распинивает CID, которые были заменены
 * более 30 дней назад (настраивается через ?maxAgeDays=N).
 *
 * Параметры:
 * - ?dryRun=true — только показать что будет удалено, без действий
 * - ?maxAgeDays=30 — порог возраста в днях (по умолчанию 30)
 *
 * Безопасность:
 * - Не распинивает CID, который сейчас используется как directoryCid
 * - Не распинивает CID, который является newCid в другой незачищенной записи
 */

import { isAuthError, requireAdmin } from '@/lib/admin-auth'
import { prisma } from '@/lib/db'
import { unpinJob } from '@/lib/pinning'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const auth = await requireAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const { searchParams } = request.nextUrl
  const dryRun = searchParams.get('dryRun') === 'true'
  const maxAgeDays = parseInt(searchParams.get('maxAgeDays') || '1', 10)

  if (isNaN(maxAgeDays) || maxAgeDays < 1) {
    return NextResponse.json({ error: 'maxAgeDays должен быть >= 1' }, { status: 400 })
  }

  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays)

  // Находим все незачищенные записи старше cutoff
  const staleEntries = await prisma.cidHistory.findMany({
    where: {
      cleanedUp: false,
      replacedAt: { lt: cutoffDate },
    },
    include: {
      anime: { select: { id: true, title: true, directoryCid: true } },
    },
  })

  if (staleEntries.length === 0) {
    return NextResponse.json({
      ok: true,
      message: 'Нет устаревших пинов для очистки',
      cleaned: 0,
      skipped: 0,
      errors: 0,
    })
  }

  // Собираем все текущие directoryCid — их нельзя распинивать
  const currentCids = new Set(staleEntries.map((e) => e.anime.directoryCid).filter(Boolean) as string[])

  // Собираем newCid из незачищенных записей — тоже нельзя распинивать
  const activeNewCids = new Set(staleEntries.map((e) => e.newCid))

  let cleaned = 0
  let skipped = 0
  let errors = 0
  const details: Array<{
    oldCid: string
    animeTitle: string
    action: 'unpinned' | 'skipped' | 'error'
    reason?: string
    unpinnedJobs?: number
  }> = []

  for (const entry of staleEntries) {
    const { oldCid } = entry

    // Проверка: oldCid не должен быть текущим directoryCid какого-либо аниме
    if (currentCids.has(oldCid)) {
      skipped++
      details.push({
        oldCid,
        animeTitle: entry.anime.title,
        action: 'skipped',
        reason: 'CID используется как текущий directoryCid',
      })
      continue
    }

    // Проверка: oldCid не должен быть newCid в другой записи (цепочка замен)
    if (activeNewCids.has(oldCid)) {
      skipped++
      details.push({
        oldCid,
        animeTitle: entry.anime.title,
        action: 'skipped',
        reason: 'CID является промежуточным (newCid другой записи)',
      })
      continue
    }

    // Дополнительная проверка: CID не используется PUBLISHED аниме
    // HIDDEN/REJECTED записи с тем же CID — не блокируют распин
    const usedByPublished = await prisma.anime.findFirst({
      where: { directoryCid: oldCid, status: 'PUBLISHED' },
      select: { id: true },
    })
    if (usedByPublished) {
      skipped++
      details.push({
        oldCid,
        animeTitle: entry.anime.title,
        action: 'skipped',
        reason: 'CID используется опубликованным аниме',
      })
      continue
    }

    if (dryRun) {
      // В dry-run считаем сколько PinJob будет затронуто
      const jobCount = await prisma.pinJob.count({
        where: { cid: oldCid, status: { in: ['PINNED', 'PINNING', 'QUEUED'] } },
      })
      cleaned++
      details.push({
        oldCid,
        animeTitle: entry.anime.title,
        action: 'unpinned',
        unpinnedJobs: jobCount,
      })
      continue
    }

    // Распинить все PinJob с этим CID
    const jobs = await prisma.pinJob.findMany({
      where: { cid: oldCid, status: { in: ['PINNED', 'PINNING', 'QUEUED'] } },
      select: { id: true },
    })

    let jobErrors = 0
    for (const job of jobs) {
      const result = await unpinJob(job.id)
      if (!result.success) {
        jobErrors++
      }
    }

    if (jobErrors > 0 && jobErrors === jobs.length) {
      // Все джобы провалились — не помечаем как очищенное
      errors++
      details.push({
        oldCid,
        animeTitle: entry.anime.title,
        action: 'error',
        reason: `Не удалось распинить ${jobErrors}/${jobs.length} заданий`,
      })
      continue
    }

    // Помечаем запись как очищенную
    await prisma.cidHistory.update({
      where: { id: entry.id },
      data: { cleanedUp: true, cleanedUpAt: new Date() },
    })

    cleaned++
    details.push({
      oldCid,
      animeTitle: entry.anime.title,
      action: 'unpinned',
      unpinnedJobs: jobs.length - jobErrors,
    })
  }

  return NextResponse.json({
    ok: true,
    dryRun,
    maxAgeDays,
    cutoffDate: cutoffDate.toISOString(),
    cleaned,
    skipped,
    errors,
    total: staleEntries.length,
    details,
  })
}

/** GET — показать статус ожидающих очистки */
export async function GET() {
  const auth = await requireAdmin()
  if (isAuthError(auth)) {
    return auth
  }

  const pendingCount = await prisma.cidHistory.count({
    where: { cleanedUp: false },
  })

  const oldestPending = await prisma.cidHistory.findFirst({
    where: { cleanedUp: false },
    orderBy: { replacedAt: 'asc' },
    select: { replacedAt: true },
  })

  const recentCleaned = await prisma.cidHistory.count({
    where: {
      cleanedUp: true,
      cleanedUpAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
  })

  return NextResponse.json({
    pendingCount,
    oldestPendingDate: oldestPending?.replacedAt?.toISOString() ?? null,
    recentCleanedCount: recentCleaned,
  })
}
