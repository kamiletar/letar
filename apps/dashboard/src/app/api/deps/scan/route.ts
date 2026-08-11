import { ingestScan } from '@/lib/deps'
import { verifyCronSecret } from '@letar/api-server'
import { NextResponse } from 'next/server'
import { z } from 'zod/v4'

const DepPackageSchema = z
  .object({
    name: z.string().max(214),
    currentVersion: z.string().max(64).nullish(),
    wantedVersion: z.string().max(64).nullish(),
    latestVersion: z.string().max(64).nullish(),
    updateKind: z.enum(['MAJOR', 'MINOR', 'PATCH', 'NONE']),
    depType: z.string().max(32),
    isPinned: z.boolean(),
    vulnerable: z.boolean(),
    maxSeverity: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).nullish(),
    advisoryCount: z.number().int().min(0).max(50),
    advisories: z.unknown().optional(),
    riskLevel: z.enum(['NONE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  })
  .strip()

const ScanSchema = z
  .object({
    // { offset: true } — scannedAt/lockfileUpdatedAt приходят с `git log --format=%cI`
    // (ISO со смещением часового пояса, напр. +03:00), не только с суффиксом Z
    scannedAt: z.iso.datetime({ offset: true }),
    source: z.string().max(32),
    gitCommit: z.string().max(64),
    gitBranch: z.string().max(200),
    lockfileUpdatedAt: z.iso.datetime({ offset: true }).nullish(),
    lockfileCommit: z.string().max(64).nullish(),
    bunVersion: z.string().max(32),
    scannerVersion: z.string().max(32),
    totalPackages: z.number().int().min(0),
    outdatedCount: z.number().int().min(0),
    majorCount: z.number().int().min(0),
    minorCount: z.number().int().min(0),
    patchCount: z.number().int().min(0),
    vulnCount: z.number().int().min(0),
    vulnCritical: z.number().int().min(0),
    vulnHigh: z.number().int().min(0),
    vulnModerate: z.number().int().min(0),
    vulnLow: z.number().int().min(0),
    pinnedOutdatedCount: z.number().int().min(0),
    riskScore: z.number().int().min(0).max(100),
    durationMs: z.number().int().min(0),
    rawAudit: z.unknown().optional(),
    packages: z.array(DepPackageSchema).max(2000),
  })
  .strip()

/**
 * POST /api/deps/scan
 * Приём снапшота от scripts/deps-scan.ts (§25 PLAN-INFRA.md).
 * Авторизация: X-Cron-Secret — тот же секрет, что и /api/alerts POST.
 */
export async function POST(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const parsed = ScanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  try {
    const result = await ingestScan(parsed.data)
    return NextResponse.json({ success: true, ...result })
  } catch (error) {
    console.error('Error in POST /api/deps/scan:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    )
  }
}
