/**
 * Account Issuer Check Route
 * Проверка NULL-регрессии `Account.issuer` (better-auth 1.7) — см. `lib/account-issuer-check.ts`.
 */

import type { FastifyInstance } from 'fastify'
import { runAccountIssuerCheck } from '../lib/account-issuer-check'
import { defineCronRoute } from '../lib/cron-route'

export async function accountIssuerCheckRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/account-issuer-check — прогон проверки (вызывается планировщиком cron.ts)
   */
  defineCronRoute(fastify, '/api/cron/account-issuer-check', runAccountIssuerCheck)
}
