#!/usr/bin/env bun

/**
 * Еженедельный контроль зависимостей (§25 PLAN-INFRA.md).
 *
 * Гоняет `bun outdated` + `bun audit` в корне монорепо на машине разработчика (на сервере
 * `node_modules` нет — сборка идёт внутри Docker) и отправляет снапшот в dashboard.
 * Автообновления пакетов НЕТ — только сбор данных и доклад. `bun update` запускает человек.
 *
 * Использование:
 *   bun scripts/deps-scan.ts               # скан + POST на dashboard
 *   bun scripts/deps-scan.ts --dry-run      # скан без отправки, печать сводки
 *   bun scripts/deps-scan.ts --out <path>   # дополнительно сохранить payload в файл
 *   bun scripts/deps-scan.ts --endpoint <url>
 */

import chalk from 'chalk'
import { execFileSync } from 'child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const SCANNER_VERSION = '1.0.0'
const ROOT = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf-8' }).trim()
const STATE_DIR = join(ROOT, '.claude', 'state')
const STATE_PATH = join(STATE_DIR, 'deps-last-scan.json')

/** Пакеты, чей major-апдейт считается критичным (риск HIGH, а не MEDIUM) */
const CRITICAL_PACKAGES = new Set([
  'next',
  'react',
  'react-dom',
  '@chakra-ui/react',
  'prisma',
  '@prisma/client',
  'typescript',
  'nx',
  '@tanstack/react-query',
  'better-auth',
])

/** Начинается ли имя пакета с этого префикса-скоупа (для `@zenstackhq/*`) */
function isZenstackPackage(name: string): boolean {
  return name.startsWith('@zenstackhq/')
}

type DepType = 'dependencies' | 'devDependencies' | 'transitive'
type UpdateKind = 'MAJOR' | 'MINOR' | 'PATCH' | 'NONE'
type VulnSeverity = 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL'
type RiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface OutdatedRow {
  name: string
  current: string
  update: string
  latest: string
  depTypeHint: DepType
}

interface Advisory {
  id: number
  url: string
  title: string
  severity: string
  cwe: string[]
  cvss: { score: number }
}

type AuditResult = Record<string, Advisory[]>

interface PackageRow {
  name: string
  currentVersion: string | null
  wantedVersion: string | null
  latestVersion: string | null
  updateKind: UpdateKind
  depType: DepType
  isPinned: boolean
  vulnerable: boolean
  maxSeverity: VulnSeverity | null
  advisoryCount: number
  advisories: Advisory[] | null
  riskLevel: RiskLevel
}

interface ScanPayload {
  scannedAt: string
  source: 'local'
  gitCommit: string
  gitBranch: string
  lockfileUpdatedAt: string | null
  lockfileCommit: string | null
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
  rawAudit: AuditResult
  packages: PackageRow[]
}

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    dryRun: args.includes('--dry-run'),
    out: readFlag(args, '--out'),
    endpoint: readFlag(args, '--endpoint'),
  }
}

function readFlag(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}

/** Semver-сравнение через встроенный Bun.semver */
function classifyUpdate(current: string, latest: string): UpdateKind {
  const cur = current.replace(/^[\^~]/, '')
  const lat = latest.replace(/^[\^~]/, '')
  if (cur === lat) {
    return 'NONE'
  }
  const [cMajor, cMinor] = cur.split('.').map((n) => parseInt(n, 10) || 0)
  const [lMajor, lMinor] = lat.split('.').map((n) => parseInt(n, 10) || 0)
  if (lMajor !== cMajor) {
    return 'MAJOR'
  }
  if (lMinor !== cMinor) {
    return 'MINOR'
  }
  return 'PATCH'
}

function readPinnedSet(): Set<string> {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
  const pinned = new Set<string>()
  for (const key of Object.keys(pkg.resolutions ?? {})) {
    pinned.add(key)
  }
  for (const key of Object.keys(pkg.overrides ?? {})) {
    pinned.add(key)
  }
  return pinned
}

function readDepTypeMap(): Map<string, DepType> {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
  const map = new Map<string, DepType>()
  for (const key of Object.keys(pkg.dependencies ?? {})) {
    map.set(key, 'dependencies')
  }
  for (const key of Object.keys(pkg.devDependencies ?? {})) {
    map.set(key, 'devDependencies')
  }
  return map
}

/** `bun outdated` не имеет `--json` (bun 1.3.14) — парсим ASCII-таблицу из stdout */
function runOutdated(): OutdatedRow[] {
  let stdout = ''
  try {
    stdout = execFileSync('bun', ['outdated'], {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 300_000,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
  } catch (error) {
    // bun outdated возвращает ненулевой exit код, когда есть устаревшие пакеты — это норма.
    // Разбираем stdout из ошибки; настоящая ошибка — только когда stdout пуст.
    const err = error as { stdout?: Buffer | string; stderr?: Buffer | string }
    stdout = err.stdout ? err.stdout.toString() : ''
    if (!stdout.trim()) {
      throw new Error(`bun outdated завершился без вывода: ${err.stderr?.toString() ?? String(error)}`)
    }
  }

  const clean = stdout.replace(/\[[0-9;]*m/g, '')
  const lines = clean.split('\n').filter((l) => l.trim().startsWith('|'))

  const rows: OutdatedRow[] = []
  for (const line of lines) {
    const cols = line
      .split('|')
      .map((c) => c.trim())
      .filter((c, i, arr) => !(i === 0 && c === '') && !(i === arr.length - 1 && c === ''))
    if (cols.length < 4) {
      continue
    }
    if (cols[0] === 'Package' || /^-+$/.test(cols[0])) {
      continue
    }

    let name = cols[0]
    let depTypeHint: DepType = 'dependencies'
    const suffixMatch = name.match(/\((dev|peer)\)\s*$/)
    if (suffixMatch) {
      name = name.replace(/\s*\((dev|peer)\)\s*$/, '').trim()
      depTypeHint = suffixMatch[1] === 'dev' ? 'devDependencies' : 'dependencies'
    }

    rows.push({ name, current: cols[1], update: cols[2], latest: cols[3], depTypeHint })
  }

  if (rows.length === 0) {
    // Пустой вывод при непустых зависимостях = формат таблицы изменился, не «всё свежее».
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
    const totalDeclared = Object.keys(pkg.dependencies ?? {}).length + Object.keys(pkg.devDependencies ?? {}).length
    if (totalDeclared > 0 && !clean.includes('No outdated')) {
      throw new Error(
        'bun outdated: парсер вернул 0 строк, а зависимостей > 0 — формат вывода `bun outdated` '
          + 'изменился, парсер в scripts/deps-scan.ts нужно чинить. Сырой вывод:\n' + clean.slice(0, 2000),
      )
    }
  }

  return rows
}

/** `bun audit --json` — баннер в stderr, JSON в stdout */
function runAudit(): AuditResult {
  let stdout = ''
  try {
    stdout = execFileSync('bun', ['audit', '--json'], {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 300_000,
      maxBuffer: 32 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch (error) {
    // Ненулевой exit при найденных уязвимостях — норма, JSON всё равно в stdout.
    const err = error as { stdout?: Buffer | string }
    stdout = err.stdout ? err.stdout.toString() : ''
  }

  if (!stdout.trim()) {
    return {}
  }

  try {
    return JSON.parse(stdout) as AuditResult
  } catch (error) {
    throw new Error(`bun audit --json: не разобрать JSON вывод: ${String(error)}`)
  }
}

function severityRank(sev: string): number {
  switch (sev.toLowerCase()) {
    case 'critical':
      return 4
    case 'high':
      return 3
    case 'moderate':
      return 2
    case 'low':
      return 1
    default:
      return 0
  }
}

function toVulnSeverity(sev: string): VulnSeverity {
  return sev.toUpperCase() as VulnSeverity
}

function computeRisk(
  updateKind: UpdateKind,
  maxSeverity: VulnSeverity | null,
  name: string,
): RiskLevel {
  const isCritical = CRITICAL_PACKAGES.has(name) || isZenstackPackage(name)

  if (maxSeverity === 'CRITICAL' || maxSeverity === 'HIGH') {
    return 'CRITICAL'
  }
  if (maxSeverity === 'MODERATE') {
    return 'HIGH'
  }
  if (updateKind === 'MAJOR' && isCritical) {
    return 'HIGH'
  }
  if (updateKind === 'MAJOR') {
    return 'MEDIUM'
  }
  if (updateKind === 'MINOR' || maxSeverity === 'LOW') {
    return 'LOW'
  }
  return 'NONE'
}

function buildPackages(outdated: OutdatedRow[], audit: AuditResult): PackageRow[] {
  const pinned = readPinnedSet()
  const depTypeMap = readDepTypeMap()

  const byName = new Map<string, PackageRow>()

  for (const row of outdated) {
    const updateKind = classifyUpdate(row.current, row.latest)
    const depType = depTypeMap.get(row.name) ?? row.depTypeHint
    byName.set(row.name, {
      name: row.name,
      currentVersion: row.current,
      wantedVersion: row.update,
      latestVersion: row.latest,
      updateKind,
      depType,
      isPinned: pinned.has(row.name),
      vulnerable: false,
      maxSeverity: null,
      advisoryCount: 0,
      advisories: null,
      riskLevel: computeRisk(updateKind, null, row.name),
    })
  }

  for (const [name, advisories] of Object.entries(audit)) {
    if (advisories.length === 0) {
      continue
    }
    const maxSeverity = advisories.reduce<string>(
      (max, a) => (severityRank(a.severity) > severityRank(max) ? a.severity : max),
      advisories[0].severity,
    )
    const severity = toVulnSeverity(maxSeverity)

    const existing = byName.get(name)
    if (existing) {
      existing.vulnerable = true
      existing.maxSeverity = severity
      existing.advisoryCount = advisories.length
      existing.advisories = advisories
      existing.riskLevel = computeRisk(existing.updateKind, severity, name)
    } else {
      byName.set(name, {
        name,
        currentVersion: null,
        wantedVersion: null,
        latestVersion: null,
        updateKind: 'NONE',
        depType: 'transitive',
        isPinned: pinned.has(name),
        vulnerable: true,
        maxSeverity: severity,
        advisoryCount: advisories.length,
        advisories,
        riskLevel: computeRisk('NONE', severity, name),
      })
    }
  }

  return [...byName.values()]
}

function computeRiskScore(packages: PackageRow[]): number {
  let critical = 0
  let high = 0
  let moderate = 0
  let lowVuln = 0
  let majorCritical = 0
  let majorOther = 0

  for (const p of packages) {
    if (p.maxSeverity === 'CRITICAL') { critical++ }
    else if (p.maxSeverity === 'HIGH') { high++ }
    else if (p.maxSeverity === 'MODERATE') { moderate++ }
    else if (p.maxSeverity === 'LOW') { lowVuln++ }

    if (p.updateKind === 'MAJOR') {
      if (CRITICAL_PACKAGES.has(p.name) || isZenstackPackage(p.name)) {
        majorCritical++
      } else {
        majorOther++
      }
    }
  }

  const score = 40 * critical + 25 * high + 8 * moderate + 2 * lowVuln + 3 * majorCritical + 0.5 * majorOther
  return Math.min(100, Math.round(score))
}

function readLockfileInfo(): { updatedAt: string | null; commit: string | null } {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cI\t%H', '--', 'bun.lock'], {
      cwd: ROOT,
      encoding: 'utf-8',
    }).trim()
    if (!out) {
      return { updatedAt: null, commit: null }
    }
    const [date, commit] = out.split('\t')
    return { updatedAt: date, commit }
  } catch {
    return { updatedAt: null, commit: null }
  }
}

function readCronSecret(): string {
  if (process.env.CRON_SECRET) {
    return process.env.CRON_SECRET
  }

  const envPath = join(ROOT, 'apps', 'dashboard', '.env.docker')
  if (existsSync(envPath)) {
    const content = readFileSync(envPath, 'utf-8')
    const match = content.match(/^CRON_SECRET=(.+)$/m)
    if (match) {
      return match[1].trim().replace(/^["']|["']$/g, '')
    }
  }

  throw new Error(
    'CRON_SECRET не найден: ни в process.env, ни в apps/dashboard/.env.docker.\n'
      + 'Синхронизируй с прода: ./scripts/pull-env-docker.sh dashboard --apply',
  )
}

/** Один запрос с собственным AbortController — таймаут 30с на КАЖДУЮ попытку, не на обе разом */
async function attemptPost(endpoint: string, secret: string, payload: ScanPayload): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30_000)
  try {
    return await fetch(`${endpoint}/api/deps/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Cron-Secret': secret },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } finally {
    clearTimeout(timeout)
  }
}

/** Таймаут 30с на попытку, один ретрай при сетевой ошибке или неуспешном статусе */
async function postScan(payload: ScanPayload, endpoint: string, secret: string): Promise<void> {
  let res: Response
  try {
    res = await attemptPost(endpoint, secret, payload)
    if (!res.ok) {
      res = await attemptPost(endpoint, secret, payload)
    }
  } catch {
    res = await attemptPost(endpoint, secret, payload)
  }

  if (!res.ok) {
    throw new Error(`POST ${endpoint}/api/deps/scan → HTTP ${res.status}: ${await res.text()}`)
  }
}

function printSummary(payload: ScanPayload): void {
  console.log(chalk.cyan.bold('\n📦 Контроль зависимостей — сводка\n'))
  console.log(chalk.gray(`Пакетов всего: ${payload.totalPackages}, устарело: ${payload.outdatedCount}`))
  console.log(
    chalk.gray(
      `  major: ${payload.majorCount} · minor: ${payload.minorCount} · patch: ${payload.patchCount}`,
    ),
  )
  console.log(
    chalk.gray(
      `Уязвимости: critical ${payload.vulnCritical} · high ${payload.vulnHigh} · `
        + `moderate ${payload.vulnModerate} · low ${payload.vulnLow}`,
    ),
  )
  console.log(chalk.yellow(`Risk score: ${payload.riskScore}/100`))

  const top10 = [...payload.packages]
    .sort((a, b) => severityRank(b.maxSeverity ?? 'none') - severityRank(a.maxSeverity ?? 'none'))
    .filter((p) => p.riskLevel !== 'NONE')
    .slice(0, 10)

  if (top10.length > 0) {
    console.log(chalk.white('\nТоп по риску:'))
    for (const p of top10) {
      console.log(
        chalk.gray(
          `  ${p.riskLevel.padEnd(8)} ${p.name} ${p.currentVersion ?? '?'} → ${p.latestVersion ?? '?'}`
            + (p.vulnerable ? chalk.red(`  [${p.maxSeverity}]`) : ''),
        ),
      )
    }
  }

  console.log(chalk.cyan('\nОбновление — руками (`bun update`), автообновления в системе нет.\n'))
}

async function main() {
  const { dryRun, out, endpoint } = parseArgs()
  const startedAt = Date.now()

  console.log(chalk.gray('Сканирую bun outdated...'))
  const outdated = runOutdated()

  console.log(chalk.gray('Сканирую bun audit...'))
  const audit = runAudit()

  const packages = buildPackages(outdated, audit)
  const riskScore = computeRiskScore(packages)
  const lockfile = readLockfileInfo()

  const gitCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf-8' }).trim()
  const gitBranch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf-8',
  }).trim()
  const bunVersion = execFileSync('bun', ['--version'], { encoding: 'utf-8' }).trim()

  const payload: ScanPayload = {
    scannedAt: new Date().toISOString(),
    source: 'local',
    gitCommit,
    gitBranch,
    lockfileUpdatedAt: lockfile.updatedAt,
    lockfileCommit: lockfile.commit,
    bunVersion,
    scannerVersion: SCANNER_VERSION,
    totalPackages: packages.length,
    outdatedCount: packages.filter((p) => p.updateKind !== 'NONE').length,
    majorCount: packages.filter((p) => p.updateKind === 'MAJOR').length,
    minorCount: packages.filter((p) => p.updateKind === 'MINOR').length,
    patchCount: packages.filter((p) => p.updateKind === 'PATCH').length,
    vulnCount: packages.filter((p) => p.vulnerable).length,
    vulnCritical: packages.filter((p) => p.maxSeverity === 'CRITICAL').length,
    vulnHigh: packages.filter((p) => p.maxSeverity === 'HIGH').length,
    vulnModerate: packages.filter((p) => p.maxSeverity === 'MODERATE').length,
    vulnLow: packages.filter((p) => p.maxSeverity === 'LOW').length,
    pinnedOutdatedCount: packages.filter((p) => p.isPinned && p.updateKind !== 'NONE').length,
    riskScore,
    durationMs: Date.now() - startedAt,
    rawAudit: audit,
    packages,
  }

  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true })
  }
  writeFileSync(
    STATE_PATH,
    JSON.stringify(
      {
        scannedAt: payload.scannedAt,
        riskScore: payload.riskScore,
        outdatedCount: payload.outdatedCount,
        vulnCount: payload.vulnCount,
      },
      null,
      2,
    ) + '\n',
  )

  if (out) {
    writeFileSync(out, JSON.stringify(payload, null, 2) + '\n')
    console.log(chalk.green(`✓ Payload сохранён в ${out}`))
  }

  printSummary(payload)

  if (dryRun) {
    console.log(chalk.yellow('--dry-run: отправка на dashboard пропущена.'))
    return
  }

  const secret = readCronSecret()
  const resolvedEndpoint = endpoint ?? process.env.DEPS_DASHBOARD_URL ?? 'https://dashboard.letar.best'

  console.log(chalk.gray(`Отправка на ${resolvedEndpoint}/api/deps/scan...`))
  await postScan(payload, resolvedEndpoint, secret)
  console.log(chalk.green('✓ Скан отправлен.'))
}

main().catch((error) => {
  console.error(chalk.red('\n✗ Ошибка:'), error instanceof Error ? error.message : error)
  process.exit(1)
})
