/**
 * Docker Prune Routes
 * Автоматическая чистка dangling-образов и builder-кэша (Backlog «Диск переполняется дублями
 * образов»), см. `lib/docker-prune.ts`
 */

import type { FastifyInstance } from 'fastify'
import { type DockerPruneResult, runDockerPrune } from '../lib/docker-prune'
import type { ApiResponse } from '../types'

export async function dockerPruneRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/docker-prune — прогон чистки (вызывается планировщиком cron.ts)
   */
  fastify.post(
    '/api/cron/docker-prune',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<DockerPruneResult>> => {
      try {
        const result = await runDockerPrune()
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
