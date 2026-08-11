/**
 * §25 PLAN-INFRA.md — еженедельный контроль зависимостей
 * Приём и хранение сканов scripts/deps-scan.ts, дедуп алертов.
 */

import { createAlert, resolveAlertsByType } from '@/lib/alerts'
import { prisma } from '@/lib/db'

// Ретеншн сканов — по образцу cleanOldAlerts, лимит по счёту, а не по возрасту
const MAX_SCANS_KEPT = 52

export interface DepPackageInput {
  name: string
  currentVersion?: string | null
  wantedVersion?: string | null
  latestVersion?: string | null
  updateKind: 'MAJOR' | 'MINOR' | 'PATCH' | 'NONE'
  depType: string
  isPinned: boolean
  vulnerable: boolean
  maxSeverity?: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | null
  advisoryCount: number
  advisories?: unknown
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
}

export interface DepScanInput {
  scannedAt: string
  source: string
  gitCommit: string
  gitBranch: string
  lockfileUpdatedAt?: string | null
  lockfileCommit?: string | null
  bunVersion: string
  scannerVersion: string
  totalPackages: number
  outdatedCount: number
  majorCount: number
  minorCount: number
  patchCount: number
  vulnCount: number
  vulnCritical: number
  vulnHigh: number
  vulnModerate: number
  vulnLow: number
  pinnedOutdatedCount: number
  riskScore: number
  durationMs: number
  rawAudit?: unknown
  packages: DepPackageInput[]
}

/**
 * Записывает скан + строки пакетов, обновляет алерты, чистит старые сканы.
 * Возвращает id нового скана и признак «нужен разбор changelog» (Этап 2: пока всегда false,
 * перенос разборов и вычисление needsAnalysis добавляются вместе с /infra:deps-analyze).
 */
export async function ingestScan(input: DepScanInput): Promise<{ scanId: string; needsAnalysis: boolean }> {
  const scan = await prisma.$transaction(async (tx) => {
    const created = await tx.depScan.create({
      data: {
        scannedAt: new Date(input.scannedAt),
        source: input.source,
        gitCommit: input.gitCommit,
        gitBranch: input.gitBranch,
        lockfileUpdatedAt: input.lockfileUpdatedAt ? new Date(input.lockfileUpdatedAt) : null,
        lockfileCommit: input.lockfileCommit ?? null,
        bunVersion: input.bunVersion,
        scannerVersion: input.scannerVersion,
        totalPackages: input.totalPackages,
        outdatedCount: input.outdatedCount,
        majorCount: input.majorCount,
        minorCount: input.minorCount,
        patchCount: input.patchCount,
        vulnCount: input.vulnCount,
        vulnCritical: input.vulnCritical,
        vulnHigh: input.vulnHigh,
        vulnModerate: input.vulnModerate,
        vulnLow: input.vulnLow,
        pinnedOutdatedCount: input.pinnedOutdatedCount,
        riskScore: input.riskScore,
        durationMs: input.durationMs,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rawAudit: (input.rawAudit ?? undefined) as any,
      },
    })

    if (input.packages.length > 0) {
      await tx.depPackage.createMany({
        data: input.packages.map((p) => ({
          scanId: created.id,
          name: p.name,
          currentVersion: p.currentVersion ?? null,
          wantedVersion: p.wantedVersion ?? null,
          latestVersion: p.latestVersion ?? null,
          updateKind: p.updateKind,
          depType: p.depType,
          isPinned: p.isPinned,
          vulnerable: p.vulnerable,
          maxSeverity: p.maxSeverity ?? null,
          advisoryCount: p.advisoryCount,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          advisories: (p.advisories ?? undefined) as any,
          riskLevel: p.riskLevel,
        })),
      })
    }

    return created
  })

  // Алерты: порог первой итерации — high+, не moderate (в репо есть вечные low/moderate в devDeps)
  if (input.vulnCritical > 0) {
    await createAlert(
      'DEPS_VULNERABLE',
      'CRITICAL',
      `Критические уязвимости в зависимостях: ${input.vulnCritical}`,
      `Скан ${scan.id}: ${input.vulnCritical} critical, ${input.vulnHigh} high. Подробности — /deps.`,
      { scanId: scan.id },
    )
  } else if (input.vulnHigh > 0) {
    await createAlert(
      'DEPS_VULNERABLE',
      'ERROR',
      `Уязвимости уровня high в зависимостях: ${input.vulnHigh}`,
      `Скан ${scan.id}: ${input.vulnHigh} high. Подробности — /deps.`,
      { scanId: scan.id },
    )
  } else {
    await resolveAlertsByType('DEPS_VULNERABLE')
  }

  await cleanOldScans()

  return { scanId: scan.id, needsAnalysis: false }
}

/** Оставляет последние MAX_SCANS_KEPT сканов (DepPackage уносится каскадом) */
async function cleanOldScans(): Promise<number> {
  const scans = await prisma.depScan.findMany({
    select: { id: true },
    orderBy: { createdAt: 'desc' },
    skip: MAX_SCANS_KEPT,
  })
  if (scans.length === 0) {
    return 0
  }
  const result = await prisma.depScan.deleteMany({
    where: { id: { in: scans.map((s) => s.id) } },
  })
  return result.count
}

export async function getLatestScan() {
  return prisma.depScan.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      packages: {
        orderBy: [{ riskLevel: 'desc' }, { name: 'asc' }],
      },
    },
  })
}

export async function getScanHistory(limit: number) {
  return prisma.depScan.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      createdAt: true,
      scannedAt: true,
      riskScore: true,
      outdatedCount: true,
      vulnCount: true,
      reviewedAt: true,
    },
  })
}
