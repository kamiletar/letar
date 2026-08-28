/**
 * Traefik Routes
 * API для бэкапа секретов Traefik на s3 (PLAN-INFRA.md §48 M2)
 */

import type { FastifyInstance } from 'fastify'
import { apiHandler, errorResponse } from '../lib/api-handler'
import {
  backupTraefik,
  getTraefikBackupsList,
  type TraefikBackupInfo,
  type TraefikBackupResult,
} from '../lib/traefik-backup'
import type { ApiResponse } from '../types'

export async function traefikRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/traefik/backup — создать бэкап секретов Traefik
   * Архивирует аккаунты acme-dns + acme.json + basicAuth
   */
  fastify.post(
    '/api/traefik/backup',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<TraefikBackupResult>> => {
      try {
        const result = await backupTraefik('auto')

        return {
          success: result.success,
          data: result,
          error: result.success ? undefined : result.error,
          timestamp: new Date().toISOString(),
        }
      } catch (error) {
        return errorResponse(error instanceof Error ? error.message : 'Unknown error')
      }
    },
  )

  /**
   * GET /api/traefik/backups — список бэкапов Traefik
   */
  fastify.get('/api/traefik/backups', apiHandler<TraefikBackupInfo[]>(() => getTraefikBackupsList()))
}
