/**
 * Prometheus Metrics Route
 * Backlog «Интеграции» — Prometheus exporter / Grafana datasource
 */

import type { FastifyInstance } from 'fastify'
import { renderPrometheusMetrics } from '../lib/metrics-exporter'

export async function metricsRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /metrics — метрики в текстовом формате Prometheus exposition
   */
  fastify.get('/metrics', async (_request, reply) => {
    const body = await renderPrometheusMetrics()
    reply.header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
    return reply.send(body)
  })
}
