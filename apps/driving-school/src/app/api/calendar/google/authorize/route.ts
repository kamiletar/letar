'use server'

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { getAppUrl } from '@/lib/app-url'
import { getSession } from '@/lib/auth'

/**
 * Google Calendar OAuth Authorization
 *
 * Отдельный OAuth flow для получения доступа к Google Calendar.
 * Используется когда пользователь хочет синхронизировать расписание,
 * но при входе не давал доступ к календарю.
 */

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

// Scopes для работы с календарём
const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events']

/**
 * GET /api/calendar/google/authorize
 *
 * Редирект на Google OAuth для получения прав на календарь
 */
export async function GET(request: NextRequest) {
  const session = await getSession()

  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/sign-in', request.url))
  }

  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID || process.env.AUTH_GOOGLE_ID
  if (!clientId) {
    return NextResponse.json({ error: 'Google OAuth not configured' }, { status: 500 })
  }

  // Определяем базовый URL
  const baseUrl = getAppUrl()

  const redirectUri = `${baseUrl}/api/calendar/google/callback`

  // Сохраняем userId в state для верификации в callback
  const state = Buffer.from(
    JSON.stringify({
      userId: session.user.id,
      timestamp: Date.now(),
    })
  ).toString('base64url')

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: CALENDAR_SCOPES.join(' '),
    access_type: 'offline', // Получаем refresh token
    prompt: 'consent', // Всегда показываем consent screen для получения refresh token
    state,
  })

  return NextResponse.redirect(`${GOOGLE_OAUTH_URL}?${params.toString()}`)
}
