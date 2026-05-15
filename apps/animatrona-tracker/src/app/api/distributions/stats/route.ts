import { verifyApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/db'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

const StatsReportSchema = z
  .object({
    peerId: z.string().min(1),
    bytesUploaded: z.number().int().min(0),
    bytesDownloaded: z.number().int().min(0),
    seedingTimeMs: z.number().int().min(0),
    peersHelped: z.number().int().min(0),
    uptimeMs: z.number().int().min(0).optional().default(0),
    activeDistributions: z.number().int().min(0),
  })
  .strip()

/**
 * POST /api/distributions/stats
 * Принимает дельту статистики раздач от Desktop клиента
 */
export async function POST(request: NextRequest) {
  const user = await verifyApiKey(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = StatsReportSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { bytesUploaded, bytesDownloaded, seedingTimeMs, peersHelped, uptimeMs, activeDistributions } = parsed.data

  try {
    // Ищем существующую запись
    const existing = await prisma.distributionStats.findUnique({
      where: { userId: user.id },
    })

    let stats
    if (existing) {
      // Обновляем — добавляем дельту к текущим значениям
      stats = await prisma.distributionStats.update({
        where: { userId: user.id },
        data: {
          totalBytesUploaded: existing.totalBytesUploaded + BigInt(bytesUploaded),
          totalBytesDownloaded: existing.totalBytesDownloaded + BigInt(bytesDownloaded),
          totalSeedingTimeMs: existing.totalSeedingTimeMs + BigInt(seedingTimeMs),
          totalPeersHelped: existing.totalPeersHelped + peersHelped,
          totalUptimeMs: existing.totalUptimeMs + BigInt(uptimeMs ?? 0),
          activeDistributions,
          lastReportedAt: new Date(),
        },
      })
    } else {
      // Создаём новую запись
      stats = await prisma.distributionStats.create({
        data: {
          userId: user.id,
          totalBytesUploaded: BigInt(bytesUploaded),
          totalBytesDownloaded: BigInt(bytesDownloaded),
          totalSeedingTimeMs: BigInt(seedingTimeMs),
          totalPeersHelped: peersHelped,
          totalUptimeMs: BigInt(uptimeMs ?? 0),
          activeDistributions,
          lastReportedAt: new Date(),
        },
      })
    }

    return NextResponse.json({
      data: {
        totalBytesUploaded: stats.totalBytesUploaded.toString(),
        totalBytesDownloaded: stats.totalBytesDownloaded.toString(),
        totalSeedingTimeMs: stats.totalSeedingTimeMs.toString(),
        totalPeersHelped: stats.totalPeersHelped,
        totalUptimeMs: stats.totalUptimeMs.toString(),
        activeDistributions: stats.activeDistributions,
      },
    })
  } catch (error) {
    console.error('Distribution stats error:', error)
    return NextResponse.json({ error: 'Ошибка сохранения статистики' }, { status: 500 })
  }
}
