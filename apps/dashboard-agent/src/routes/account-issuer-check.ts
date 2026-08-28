/**
 * Account Issuer Check Route
 * Проверка NULL-регрессии `Account.issuer` (better-auth 1.7) — см. `lib/account-issuer-check.ts`.
 */

import type { FastifyInstance } from 'fastify'
import { type AccountIssuerCheckResult, runAccountIssuerCheck } from '../lib/account-issuer-check'
import type { ApiResponse } from '../types'

export async function accountIssuerCheckRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/cron/account-issuer-check — прогон проверки (вызывается планировщиком cron.ts)
   */
  fastify.post(
    '/api/cron/account-issuer-check',
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<AccountIssuerCheckResult>> => {
      try {
        const result = await runAccountIssuerCheck()
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
