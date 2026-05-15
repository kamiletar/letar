/**
 * Dev-only endpoint для создания сессии без OIDC.
 * Используется для preview-верификации и e2e тестов.
 *
 * GET /api/auth/dev-session?email=admin@grandslamcup.ru
 * → Создаёт сессию, устанавливает cookie, редиректит на /admin
 *
 * ⚠️ Работает ТОЛЬКО в development mode (NODE_ENV !== 'production')
 *
 * Формат подписи: Hono signed cookie (HMAC-SHA256, base64).
 * Hono: value = `${token}.${btoa(hmac(token, secret))}`, cookie = encodeURIComponent(value)
 */

import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  // Блокируем в production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
  }

  const url = new URL(request.url)
  const email = url.searchParams.get('email') || 'admin@grandslamcup.ru'
  const redirect = url.searchParams.get('redirect') || '/admin'

  // Находим или создаём пользователя
  let user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    user = await prisma.user.create({
      data: {
        name: email.split('@')[0],
        email,
        emailVerified: true,
        roles: email.includes('admin') ? ['ADMIN', 'USER'] : ['USER'],
      },
    })
  }

  const sessionToken = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 дней

  // Создаём сессию напрямую в БД
  await prisma.session.create({
    data: {
      id: crypto.randomUUID(),
      userId: user.id,
      token: sessionToken,
      expiresAt,
      ipAddress: '127.0.0.1',
      userAgent: 'Claude Preview / E2E Test',
    },
  })

  // Подписываем cookie в формате Hono: HMAC-SHA256, btoa (стандартный base64)
  const secret = process.env.BETTER_AUTH_SECRET || ''
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, [
    'sign',
  ])
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(sessionToken))
  // Hono использует btoa(String.fromCharCode(...bytes)) — стандартный base64
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)))
  const signedValue = `${sessionToken}.${signatureB64}`

  // Устанавливаем cookie вручную через Set-Cookie header
  // (Next.js cookies.set может добавить лишнее encoding)
  const cookieValue = encodeURIComponent(signedValue)
  const maxAge = 7 * 24 * 60 * 60
  const response = NextResponse.redirect(new URL(redirect, request.url))
  response.headers.append(
    'Set-Cookie',
    `better-auth.session_token=${cookieValue}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax`
  )

  return response
}
