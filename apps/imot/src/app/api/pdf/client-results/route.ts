import { getClientDashboardStats, getLevelProgressHistory } from '@/app/_actions/client-dashboard.actions'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { ClientResultsPDF } from '@/lib/pdf/client-results-pdf'
import { renderToStream } from '@react-pdf/renderer'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import React from 'react'

/**
 * API ROUTE: ГЕНЕРАЦИЯ PDF РЕЗУЛЬТАТОВ КЛИЕНТА
 * GET /api/pdf/client-results
 *
 * Генерирует PDF документ с результатами прогресса клиента
 * Доступно только для клиентов (роль CLIENT)
 */
export async function GET(_request: NextRequest) {
  try {
    // Аутентификация
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли (только CLIENT)
    if (session.user.role !== 'CLIENT') {
      return NextResponse.json({ error: 'Forbidden: Client access required' }, { status: 403 })
    }

    // Получение данных клиента с enhanced Prisma
    const db = getEnhancedPrisma(session.user)

    const client = await db.client.findFirst({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client profile not found' }, { status: 404 })
    }

    // Получение статистики и истории прогресса
    const stats = await getClientDashboardStats()
    const histories = await getLevelProgressHistory(undefined, undefined, 90)

    // Подготовка данных для PDF
    const pdfData = {
      client: {
        name: client.name,
        email: client.email,
      },
      stats,
      histories,
      generatedAt: new Date(),
    }

    // Генерация PDF
    // oxlint-disable-next-line no-explicit-any
    const stream = await renderToStream(React.createElement(ClientResultsPDF, { data: pdfData }) as any)

    // Возврат PDF как stream
    const fileName = `progress-${client.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (error) {
    console.error('Error generating client results PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
