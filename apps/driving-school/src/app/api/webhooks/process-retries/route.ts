/**
 * API Route: Webhook Retry Processing
 *
 * Эндпоинт для cron job, который обрабатывает повторные попытки доставки webhook.
 * Рекомендуется вызывать каждую минуту.
 *
 * Защита: Bearer токен из CRON_SECRET
 */

import { NextResponse } from 'next/server'

import { processWebhookRetries } from '@/lib/webhooks'

export async function POST(request: Request) {
  // Проверяем авторизацию через Bearer token
  const authHeader = request.headers.get('Authorization')
  const expectedToken = process.env.CRON_SECRET

  if (!expectedToken) {
    console.error('[Webhook Retry API] CRON_SECRET not configured')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await processWebhookRetries()

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('[Webhook Retry API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Метод GET для health check
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'webhook-retry-processor',
    method: 'POST with Bearer token',
  })
}
