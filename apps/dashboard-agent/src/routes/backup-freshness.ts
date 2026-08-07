/**
 * Backup Freshness Routes
 * Проверка «есть ли свежий бэкап» для бэкапов, которые создаются вне агента:
 * Maddy (Этап 0.3 корневого PLAN.md) и acme-dns (PLAN-INFRA.md §48).
 */

import type { FastifyInstance } from 'fastify'
import {
  type BackupFreshnessCheckResult,
  runAcmeDnsBackupFreshnessCheck,
  runBackupFreshnessCheck,
} from '../lib/backup-freshness'
import type { ApiResponse } from '../types'

export async function backupFreshnessRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/backup-freshness-check — прогон проверки Maddy (вызывается планировщиком cron.ts)
   *
   * Путь оставлен без суффикса `maddy-` намеренно: он уже прописан в cron-задаче на проде
   * (`maddy-backup-freshness-check`), переименование потребовало бы правки конфига на сервере
   * ради косметики.
   */
  fastify.post(
    '/api/cron/backup-freshness-check',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<BackupFreshnessCheckResult>> => {
      try {
        const result = await runBackupFreshnessCheck()
        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    },
  )

  /**
   * POST /api/cron/acme-dns-backup-freshness-check — прогон проверки acme-dns
   */
  fastify.post(
    '/api/cron/acme-dns-backup-freshness-check',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<BackupFreshnessCheckResult>> => {
      try {
        const result = await runAcmeDnsBackupFreshnessCheck()
        return {
          success: true,
          data: result,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }
      }
    },
  )
}
