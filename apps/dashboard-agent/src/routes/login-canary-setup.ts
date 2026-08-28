/**
 * Login Canary Setup Route
 * Одноразовый провижининг канареечного аккаунта в одном приложении (см. `lib/login-canary-setup.ts`).
 * Вызывается вручную оператором, не планировщиком cron.ts.
 */

import type { FastifyInstance } from 'fastify'
import { type LoginCanarySetupResult, setupLoginCanaryAccount } from '../lib/login-canary-setup'
import type { ApiResponse } from '../types'

interface SetupBody {
  app?: string
  email?: string
  password?: string
}

export async function loginCanarySetupRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/admin/login-canary-setup — { app, email, password }
   */
  fastify.post<{ Body: SetupBody }>(
    '/api/admin/login-canary-setup',
    {
      schema: {
        body: {
          type: 'object',
          required: ['app', 'email', 'password'],
          properties: {
            app: { type: 'string' },
            email: { type: 'string' },
            password: { type: 'string' },
          },
        },
      },
    },
    async (request): Promise<ApiResponse<LoginCanarySetupResult>> => {
      const { app, email, password } = request.body

      if (!app || !email || !password) {
        return {
          success: false,
          error: 'app, email и password обязательны',
          timestamp: new Date().toISOString(),
        }
      }

      try {
        const result = await setupLoginCanaryAccount(app, email, password)
        return {
          success: result.signUpOk,
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
