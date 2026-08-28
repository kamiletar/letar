/**
 * Общий helper регистрации cron-роутов
 * Все `POST /api/cron/<name>` роуты имеют идентичное тело: схема тела без валидации полей,
 * прогон runner-функции и оборачивание результата/ошибки в `ApiResponse<T>`.
 */

import type { FastifyInstance } from 'fastify'
import type { ApiResponse } from '../types'

export function defineCronRoute<T>(
  fastify: FastifyInstance,
  path: string,
  runner: () => Promise<T>,
): void {
  fastify.post(
    path,
    { schema: { body: { type: 'object', additionalProperties: true } } },
    async (): Promise<ApiResponse<T>> => {
      try {
        const result = await runner()
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
