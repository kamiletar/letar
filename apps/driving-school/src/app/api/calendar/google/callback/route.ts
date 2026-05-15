import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getAppUrl } from '@/lib/app-url'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

/**
 * Google Calendar OAuth Callback
 *
 * Обрабатывает ответ от Google OAuth и сохраняет токены для календаря.
 */

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'

interface GoogleTokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
  token_type: string
  scope: string
}

/**
 * GET /api/calendar/google/callback
 *
 * Обработка callback от Google OAuth
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  // Базовый URL для редиректов
  const baseUrl = getAppUrl()

  // Обработка ошибки от Google
  if (error) {
    console.error('[Calendar OAuth] Error from Google:', error)
    return NextResponse.redirect(`${baseUrl}/settings/calendar?error=oauth_denied`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/settings/calendar?error=missing_params`)
  }

  // Проверяем сессию
  const session = await getSession()
  if (!session?.user?.id) {
    return NextResponse.redirect(`${baseUrl}/sign-in`)
  }

  // Декодируем и проверяем state
  try {
    const stateData = JSON.parse(Buffer.from(state, 'base64url').toString())

    // Проверяем userId
    if (stateData.userId !== session.user.id) {
      console.error('[Calendar OAuth] User ID mismatch')
      return NextResponse.redirect(`${baseUrl}/settings/calendar?error=invalid_state`)
    }

    // Проверяем timestamp (не старше 10 минут)
    if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
      console.error('[Calendar OAuth] State expired')
      return NextResponse.redirect(`${baseUrl}/settings/calendar?error=state_expired`)
    }
  } catch {
    console.error('[Calendar OAuth] Invalid state')
    return NextResponse.redirect(`${baseUrl}/settings/calendar?error=invalid_state`)
  }

  // Обмениваем code на токены
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.AUTH_GOOGLE_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${baseUrl}/settings/calendar?error=not_configured`)
  }

  const redirectUri = `${baseUrl}/api/calendar/google/callback`

  try {
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('[Calendar OAuth] Token exchange failed:', errorData)
      return NextResponse.redirect(`${baseUrl}/settings/calendar?error=token_exchange_failed`)
    }

    const tokens: GoogleTokenResponse = await tokenResponse.json()

    // Сохраняем токены в CalendarConnection или отдельную таблицу
    // Для простоты обновляем Account или создаём запись в CalendarConnection
    await prisma.calendarConnection.upsert({
      where: {
        userId_provider_calendarId: {
          userId: session.user.id,
          provider: 'GOOGLE',
          calendarId: 'pending', // Временный ID, будет обновлён при выборе календаря
        },
      },
      create: {
        userId: session.user.id,
        provider: 'GOOGLE',
        calendarId: 'pending',
        calendarName: 'Google Calendar',
        syncDirection: 'EXPORT_ONLY',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        syncStatus: 'PENDING',
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    })

    // Редирект на страницу настроек календаря с успехом
    return NextResponse.redirect(`${baseUrl}/settings/calendar?success=calendar_connected`)
  } catch (error) {
    console.error('[Calendar OAuth] Error:', error)
    return NextResponse.redirect(`${baseUrl}/settings/calendar?error=internal_error`)
  }
}
