import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { TransformationPlanPDF } from '@/lib/pdf/transformation-plan-pdf'
import { renderToStream } from '@react-pdf/renderer'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import React from 'react'

/**
 * API ROUTE: ГЕНЕРАЦИЯ PDF ПЛАНА ТРАНСФОРМАЦИИ
 * GET /api/pdf/plan/[planId]
 *
 * Генерирует PDF документ с планом трансформации и практиками
 */
export async function GET(request: NextRequest, context: { params: Promise<{ planId: string }> }) {
  try {
    // Аутентификация
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверка роли (только SPECIALIST и ADMIN)
    if (session.user.role !== 'SPECIALIST' && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden: Specialist or Admin access required' }, { status: 403 })
    }

    // Получение planId из параметров
    const { planId } = await context.params

    // Получение плана трансформации с enhanced Prisma
    const db = getEnhancedPrisma(session.user)

    const plan = await db.transformationPlan.findUnique({
      where: { id: planId },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Получаем практики клиента отдельно (Practice связана с Client, не с TransformationPlan)
    const practices = plan
      ? await db.practice.findMany({
          where: { clientId: plan.clientId },
          select: {
            id: true,
            title: true,
            description: true,
            frequency: true,
            duration: true,
            level: true,
            isCompleted: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        })
      : []

    if (!plan) {
      return NextResponse.json({ error: 'Plan not found' }, { status: 404 })
    }

    // Подготовка данных для PDF
    const pdfData = {
      plan,
      client: plan.client,
      practices,
    }

    // Генерация PDF
    // oxlint-disable-next-line no-explicit-any
    const stream = await renderToStream(React.createElement(TransformationPlanPDF, { data: pdfData }) as any)

    // Возврат PDF как stream
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="plan-${plan.client.name.replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating transformation plan PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
