import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

/**
 * Better Auth API Route Handler
 *
 * Обрабатывает все auth endpoints:
 * - POST /api/auth/sign-in/username - вход по username
 * - POST /api/auth/sign-out - выход
 * - GET /api/auth/session - получение сессии
 */
export const { GET, POST } = toNextJsHandler(auth)
