/**
 * Nginx Routes
 * API для бэкапа Nginx Proxy Manager
 */

import type { FastifyInstance } from 'fastify'
import { apiHandler, errorResponse } from '../lib/api-handler'
import { backupNginx, getNginxBackupsList, type NginxBackupInfo, type NginxBackupResult } from '../lib/nginx-backup'
import type { ApiResponse } from '../types'

export async function nginxRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/nginx/backup — создать бэкап NPM
   * Архивирует data/ + letsencrypt/ в tar.gz
   */
  fastify.post(
    '/api/nginx/backup',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<NginxBackupResult>> => {
      try {
        const result = await backupNginx('auto')

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
   * GET /api/nginx/backups — список бэкапов NPM
   */
  fastify.get('/api/nginx/backups', apiHandler<NginxBackupInfo[]>(() => getNginxBackupsList()))
}
