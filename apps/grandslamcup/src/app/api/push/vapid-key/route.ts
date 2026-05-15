import { NextResponse } from 'next/server'

/** Публичный VAPID ключ для подписки на push */
export function GET() {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!key) {
    return NextResponse.json({ error: 'VAPID не настроен' }, { status: 503 })
  }
  return NextResponse.json({ publicKey: key })
}
