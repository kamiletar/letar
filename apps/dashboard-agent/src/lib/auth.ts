/**
 * Token Authentication Middleware
 * Проверка Bearer токена для защиты API агента
 */

import type { FastifyReply, FastifyRequest } from 'fastify'

/**
 * Токен из переменной окружения
 * Должен совпадать с токеном, сохранённым в Dashboard БД для этого сервера
 */
const AGENT_TOKEN = process.env.AGENT_TOKEN || ''

/**
 * Проверяет валидность токена авторизации
 */
export function verifyToken(token: string): boolean {
  if (!AGENT_TOKEN) {
    console.warn('[Auth] AGENT_TOKEN not configured, rejecting all requests')
    return false
  }

  return token === AGENT_TOKEN
}

/**
 * Fastify preHandler для проверки авторизации
 * Пропускает только запросы с валидным Bearer токеном
 */
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  // Health endpoint доступен без авторизации
  if (request.url === '/health') {
    return
  }

  const authHeader = request.headers.authorization

  if (!authHeader) {
    reply.code(401).send({
      success: false,
      error: 'Authorization header required',
      timestamp: new Date().toISOString(),
    })
    return
  }

  // Формат: "Bearer <token>"
  const [type, token] = authHeader.split(' ')

  if (type !== 'Bearer' || !token) {
    reply.code(401).send({
      success: false,
      error: 'Invalid authorization format. Expected: Bearer <token>',
      timestamp: new Date().toISOString(),
    })
    return
  }

  if (!verifyToken(token)) {
    reply.code(403).send({
      success: false,
      error: 'Invalid token',
      timestamp: new Date().toISOString(),
    })
    return
  }

  // Токен валиден, продолжаем
}

/**
 * Хеширует токен для безопасного хранения
 * Используется Dashboard при создании сервера
 */
export function hashToken(token: string): string {
  const crypto = require('node:crypto')
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Генерирует новый безопасный токен
 */
export function generateToken(): string {
  const crypto = require('node:crypto')
  return crypto.randomBytes(32).toString('hex')
}
