/**
 * Грубый счётчик посещений (hits/day/domain) без ПДн.
 *
 * Дополняет Umami там, где cookie-consent gate (152-ФЗ opt-in, см. personal-data.md §5) не
 * пропускает часть трафика: посетителей, ушедших до решения по баннеру, и самый первый pageview
 * даже у согласившихся. Цель метрики — только знать, сколько раз открыли страницу, не кто и не
 * сколько уникальных пользователей — поэтому идентификатор посетителя (IP/UA/cookie) здесь не
 * нужен вообще, и cookie-consent на него не распространяется: 152-ФЗ регулирует обработку данных,
 * относящихся к определённому/определяемому физлицу (ст. 3), а инкремент общего счётчика без
 * привязки к посетителю не создаёт такой связи ни на одном шаге.
 *
 * Источник данных — access-логи Nginx Proxy Manager (по одному файлу на proxy host,
 * `infra/nginx-proxy-manager/data/logs/proxy-host-<id>_access.log`), которые NPM пишет и так, вне
 * зависимости от этой функции. Мы только считаем НОВЫЕ строки с прошлого запуска (инкрементальное
 * чтение по byte offset) и суммируем в PageViewCount(date, domain) — сами строки лога никогда не
 * попадают в БД dashboard, только число.
 */

import type { PageViewCount } from '@/generated/models'
import { getWorkspaceDir, runOnHost } from '@/lib/host-exec'
import { npmApi } from '@/lib/nginx-proxy-manager'
import { prisma } from './db'

function accessLogPath(proxyHostId: number): string {
  return `${getWorkspaceDir()}/infra/nginx-proxy-manager/data/logs/proxy-host-${proxyHostId}_access.log`
}

/** YYYY-MM-DD в московском времени — независимо от TZ процесса */
function todayDateKey(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(new Date())
}

async function getFileSizeBytes(path: string): Promise<number> {
  const result = await runOnHost(`stat -c%s "${path}" 2>/dev/null || echo 0`)
  const size = Number.parseInt(result.stdout.trim(), 10)
  return Number.isFinite(size) ? size : 0
}

/** Считает строки в файле от байта `fromByte` (0-based) до конца */
async function countLinesSince(path: string, fromByte: number): Promise<number> {
  const result = await runOnHost(`tail -c +${fromByte + 1} "${path}" 2>/dev/null | wc -l`)
  const count = Number.parseInt(result.stdout.trim(), 10)
  return Number.isFinite(count) ? count : 0
}

export interface PageViewCounterResult {
  domainsProcessed: number
  totalNewHits: number
  errors: string[]
}

/**
 * Обновляет PageViewCount за сегодня для всех доменов из proxy hosts NPM.
 * Вызывается по расписанию (cron job `s2-pageview-count`, см. dashboard-agent/lib/cron.ts).
 */
export async function updatePageViewCounts(): Promise<PageViewCounterResult> {
  const errors: string[] = []
  let domainsProcessed = 0
  let totalNewHits = 0

  let proxyHosts: Awaited<ReturnType<typeof npmApi.getProxyHosts>>
  try {
    proxyHosts = await npmApi.getProxyHosts()
  } catch (error) {
    return {
      domainsProcessed: 0,
      totalNewHits: 0,
      errors: [`NPM API недоступен: ${error instanceof Error ? error.message : 'unknown error'}`],
    }
  }

  const date = todayDateKey()

  for (const host of proxyHosts) {
    // Один access-лог на proxy host — берём первый домен как представителя (в летар пока нет
    // хостов с несколькими доменами на разные приложения, см. комментарий в README nginx-proxy-manager)
    const domain = host.domain_names[0]
    if (!domain) {
      continue
    }

    try {
      const path = accessLogPath(host.id)
      const currentSize = await getFileSizeBytes(path)

      const offsetRow = await prisma.pageViewLogOffset.findUnique({ where: { domain } })
      const previousOffset = offsetRow ? Number(offsetRow.byteOffset) : 0

      // Файл ротировался/усечён (logrotate) — считаем с начала, а не отрицательный диапазон
      const fromByte = currentSize < previousOffset ? 0 : previousOffset

      if (currentSize > fromByte) {
        const newHits = await countLinesSince(path, fromByte)

        if (newHits > 0) {
          await prisma.pageViewCount.upsert({
            where: { date_domain: { date, domain } },
            create: { date, domain, count: newHits },
            update: { count: { increment: newHits } },
          })
          totalNewHits += newHits
        }

        await prisma.pageViewLogOffset.upsert({
          where: { domain },
          create: { domain, byteOffset: BigInt(currentSize) },
          update: { byteOffset: BigInt(currentSize) },
        })
      }

      domainsProcessed++
    } catch (error) {
      errors.push(`${domain}: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  return { domainsProcessed, totalNewHits, errors }
}

export interface DomainPageViews {
  domain: string
  today: number
  last7Days: number
}

/** Агрегат для UI `/analytics` — сегодня и сумма за последние 7 дней по каждому домену */
export async function getPageViewsSummary(): Promise<DomainPageViews[]> {
  const today = todayDateKey()
  const sevenDaysAgoDate = new Date()
  sevenDaysAgoDate.setDate(sevenDaysAgoDate.getDate() - 6)
  const sevenDaysAgo = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow' }).format(sevenDaysAgoDate)

  const rows: PageViewCount[] = await prisma.pageViewCount.findMany({
    where: { date: { gte: sevenDaysAgo } },
  })

  const byDomain = new Map<string, DomainPageViews>()
  for (const row of rows) {
    const entry = byDomain.get(row.domain) ?? { domain: row.domain, today: 0, last7Days: 0 }
    entry.last7Days += row.count
    if (row.date === today) {
      entry.today += row.count
    }
    byDomain.set(row.domain, entry)
  }

  return [...byDomain.values()].sort((a, b) => b.last7Days - a.last7Days)
}
