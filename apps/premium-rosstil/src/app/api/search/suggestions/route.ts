import { getPrisma } from '@/lib/db'
import { type NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/search/suggestions?q=...&limit=8
 * Публичный endpoint для подсказок поиска по каталогу
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const query = searchParams.get('q')?.trim() || ''
  const limit = Math.min(Number(searchParams.get('limit')) || 8, 20)

  if (query.length < 2) {
    return NextResponse.json({ suggestions: [] })
  }

  try {
    const db = getPrisma()

    const products = await db.product.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    })

    return NextResponse.json({
      suggestions: products.map((p) => ({ id: p.id, name: p.name })),
    })
  } catch (error) {
    console.error('Search suggestions error:', error)
    return NextResponse.json({ suggestions: [] })
  }
}
