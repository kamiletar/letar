import { db } from '@/lib/db'
import { NextResponse } from 'next/server'

const CLEANUP_SECRET = process.env.CLEANUP_SECRET

/** Макс. возраст записей — 24 часа */
const MAX_AGE_MS = 24 * 60 * 60 * 1000

/**
 * Cron endpoint для очистки старых демо-записей.
 * Защита: секретный токен в query string.
 * Использование: GET /api/cleanup?secret=<CLEANUP_SECRET>
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get('secret')

  if (!CLEANUP_SECRET || secret !== CLEANUP_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - MAX_AGE_MS)

  const [products, contacts] = await Promise.all([
    db.product.deleteMany({ where: { createdAt: { lt: cutoff } } }),
    db.contact.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ])

  return NextResponse.json({
    deleted: {
      products: products.count,
      contacts: contacts.count,
    },
    cutoff: cutoff.toISOString(),
  })
}
