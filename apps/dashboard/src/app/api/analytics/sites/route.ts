/**
 * API: /api/analytics/sites
 * GET — список сайтов из Umami с метриками
 * POST — создать новый сайт в Umami
 */

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const UMAMI_API_URL = process.env.UMAMI_API_URL || 'https://stats.letar.best'
const UMAMI_API_USER = process.env.UMAMI_API_USER || 'admin'
const UMAMI_API_PASSWORD = process.env.UMAMI_API_PASSWORD || ''

/** Получить токен авторизации Umami */
async function getUmamiToken(): Promise<string> {
  const res = await fetch(`${UMAMI_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: UMAMI_API_USER,
      password: UMAMI_API_PASSWORD,
    }),
  })

  if (!res.ok) {
    throw new Error(`Umami auth failed: ${res.status}`)
  }

  const data = await res.json()
  return data.token
}

export async function GET() {
  try {
    const token = await getUmamiToken()

    const res = await fetch(`${UMAMI_API_URL}/api/websites`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (!res.ok) {
      throw new Error(`Umami API error: ${res.status}`)
    }

    const data = await res.json()
    // Umami v2 возвращает { data: [...], count, page, pageSize }
    const websites = data.data ?? data

    return NextResponse.json({ data: websites })
  } catch (error) {
    console.error('[Analytics] Ошибка получения сайтов:', error)
    return NextResponse.json({ error: 'Не удалось получить список сайтов' }, { status: 502 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, domain } = body

    if (!name || !domain) {
      return NextResponse.json({ error: 'Поля name и domain обязательны' }, { status: 400 })
    }

    const token = await getUmamiToken()

    const res = await fetch(`${UMAMI_API_URL}/api/websites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, domain }),
    })

    if (!res.ok) {
      const errorText = await res.text().catch(() => '')
      let errorMessage = `Umami API error: ${res.status}`
      try {
        const errorData = JSON.parse(errorText)
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        if (errorText) {
          errorMessage = errorText
        }
      }
      console.error('[Analytics] Umami API отклонил запрос:', { status: res.status, body: errorText })
      return NextResponse.json({ error: errorMessage }, { status: res.status })
    }

    const website = await res.json()
    return NextResponse.json({ data: website }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка'
    console.error('[Analytics] Ошибка создания сайта:', message)
    return NextResponse.json({ error: message }, { status: 502 })
  }
}
