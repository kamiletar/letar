/**
 * Общий helper для GET/POST-хендлеров, чьё тело — целиком try/catch → ApiResponse<T>
 * без промежуточных early-return'ов и без кастомного вычисления success/error из
 * данных бизнес-логики. Такие хендлеры вызывают ровно одну функцию и оборачивают
 * её результат/исключение.
 *
 * НЕ годится для хендлеров с валидацией входных данных до вызова (early-return
 * {success:false} без исключения) или с success/error, вычисляемым из полей
 * результата (`git.ts` pull, `database.ts` backup, `traefik/acme-dns/nginx.ts`
 * backup) — там try/catch не единственная логика, обобщение потеряло бы читаемость.
 */

import type { FastifyRequest } from 'fastify'
import type { ApiResponse } from '../types'

/**
 * Общий helper для литерала ошибки `{ success: false, error, timestamp }`,
 * используемого в ранних return'ах валидации и в catch-блоках хендлеров,
 * которые не подходят под apiHandler() целиком.
 */
export function errorResponse<T = never>(error: string): ApiResponse<T> {
  return {
    success: false,
    error,
    timestamp: new Date().toISOString(),
  }
}

export function apiHandler<T, Request = FastifyRequest>(
  fn: (request: Request) => Promise<T>,
): (request: Request) => Promise<ApiResponse<T>> {
  return async (request: Request) => {
    try {
      const data = await fn(request)
      return {
        success: true,
        data,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }
    }
  }
}
