import { auth } from '@/lib/auth'
import { toNextJsHandler } from 'better-auth/next-js'

/**
 * Better Auth API route handler
 *
 * Обрабатывает все auth запросы:
 * - /api/auth/sign-in
 * - /api/auth/sign-up
 * - /api/auth/sign-out
 * - /api/auth/session
 * - /api/auth/callback/*
 */
export const { GET, POST } = toNextJsHandler(auth)
