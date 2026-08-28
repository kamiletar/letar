/**
 * Docker Prune Routes
 * Автоматическая чистка dangling-образов и builder-кэша (Backlog «Диск переполняется дублями
 * образов»), см. `lib/docker-prune.ts`
 */

import type { FastifyInstance } from 'fastify'
import { defineCronRoute } from '../lib/cron-route'
import { runDockerPrune } from '../lib/docker-prune'

export async function dockerPruneRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/docker-prune — прогон чистки (вызывается планировщиком cron.ts)
   */
  defineCronRoute(fastify, '/api/cron/docker-prune', runDockerPrune)
}
