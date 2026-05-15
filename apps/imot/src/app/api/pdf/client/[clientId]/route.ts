import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { ClientProfilePDF } from '@/lib/pdf/client-profile-pdf'
import { renderToStream } from '@react-pdf/renderer'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import React from 'react'

/**
 * API ROUTE: ГЕНЕРАЦИЯ PDF ПРОФИЛЯ КЛИЕНТА
 * GET /api/pdf/client/[clientId]
 *
 * Генерирует PDF документ с полным профилем клиента (все 5 уровней)
 */
export async function GET(request: NextRequest, context: { params: Promise<{ clientId: string }> }) {
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

    // Получение clientId из параметров
    const { clientId } = await context.params

    // Получение данных клиента с enhanced Prisma (учитывает политики доступа)
    const db = getEnhancedPrisma(session.user)

    const client = await db.client.findUnique({
      where: { id: clientId },
      include: {
        numerologyProfile: true,
        neuroPsychProfile: true,
        energyProfile: true,
        bodyProfile: true,
        styleProfile: true,
      },
    })

    if (!client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 })
    }

    // Подготовка данных для PDF
    const pdfData = {
      client: {
        id: client.id,
        name: client.name,
        email: client.email,
        phone: client.phone,
        birthdate: client.birthdate,
        gender: client.gender,
      },
      numerology: client.numerologyProfile,
      neuroPsych: client.neuroPsychProfile,
      energy: client.energyProfile,
      body: client.bodyProfile,
      style: client.styleProfile,
    }

    // Генерация PDF
    // oxlint-disable-next-line no-explicit-any
    const stream = await renderToStream(React.createElement(ClientProfilePDF, { data: pdfData }) as any)

    // Возврат PDF как stream
    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="profile-${client.name.replace(/\s+/g, '-')}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating client profile PDF:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}
