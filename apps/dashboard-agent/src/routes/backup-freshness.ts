/**
 * Backup Freshness Routes
 * Проверка «есть ли свежий бэкап» для бэкапов, которые создаются вне агента:
 * Maddy (Этап 0.3 корневого PLAN.md), acme-dns на s2 и секреты Traefik на s3 (PLAN-INFRA.md §48).
 */

import type { FastifyInstance } from 'fastify'
import {
  runAcmeDnsBackupFreshnessCheck,
  runBackupFreshnessCheck,
  runTraefikBackupFreshnessCheck,
} from '../lib/backup-freshness'
import { defineCronRoute } from '../lib/cron-route'

export async function backupFreshnessRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/backup-freshness-check — прогон проверки Maddy (вызывается планировщиком cron.ts)
   *
   * Путь оставлен без суффикса `maddy-` намеренно: он уже прописан в cron-задаче на проде
   * (`maddy-backup-freshness-check`), переименование потребовало бы правки конфига на сервере
   * ради косметики.
   */
  defineCronRoute(fastify, '/api/cron/backup-freshness-check', runBackupFreshnessCheck)

  /**
   * POST /api/cron/acme-dns-backup-freshness-check — прогон проверки acme-dns
   */
  defineCronRoute(fastify, '/api/cron/acme-dns-backup-freshness-check', runAcmeDnsBackupFreshnessCheck)

  /**
   * POST /api/cron/traefik-backup-freshness-check — прогон проверки секретов Traefik на s3
   */
  defineCronRoute(fastify, '/api/cron/traefik-backup-freshness-check', runTraefikBackupFreshnessCheck)
}
