import { auth } from '@/lib/auth-config'
import { toNextJsHandler } from 'better-auth/next-js'

/**
 * Better Auth API Route Handler
 *
 * Обрабатывает все auth-related запросы:
 * - /api/auth/sign-in/email
 * - /api/auth/sign-up/email
 * - /api/auth/sign-out
 * - /api/auth/session
 * - /api/auth/callback/google
 * - /api/auth/callback/yandex
 * - и другие...
 */
export const { GET, POST } = toNextJsHandler(auth)
