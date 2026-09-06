/**
 * Registry GC Route
 * Плановый ретеншн тегов self-hosted Docker Registry на s3, см. `lib/registry-gc.ts`
 */

import type { FastifyInstance } from 'fastify'
import { defineCronRoute } from '../lib/cron-route'
import { runRegistryGc } from '../lib/registry-gc'

export async function registryGcRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/registry-gc — прогон ретеншна (вызывается планировщиком cron.ts)
   */
  defineCronRoute(fastify, '/api/cron/registry-gc', runRegistryGc)
}
