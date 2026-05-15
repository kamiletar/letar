/* eslint-disable no-console */
export const dynamic = 'force-dynamic'

import { PrismaClient } from '@/generated/prisma/client'
import { sendPracticeDiaryReminderEmail } from '@/lib/email'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

/**
 * API Route для отправки напоминаний о заполнении дневника практик
 *
 * Проверяет клиентов, у которых:
 * - Есть назначенные практики (isAssigned = true)
 * - Есть практики без заметок или с давними заметками
 * - Последнее обновление заметок было > 3 дней назад (или отсутствует)
 *
 * Использование:
 * - Вызывать через cron job (например, 2 раза в неделю)
 * - Или через внешний сервис типа cron-job.org
 * - Или вручную: GET /api/cron/practice-diary-reminders?secret=YOUR_SECRET
 *
 * Защита: требует секретный ключ в query параметре
 */
export async function GET(request: Request) {
  // Инициализация внутри handler — иначе Turbopack выполняет top-level код при сборке
  const adapter = new PrismaPg({ connectionString: process.env['DATABASE_URL']! })
  const prisma = new PrismaClient({ adapter })

  try {
    // Проверка секретного ключа для защиты от несанкционированного доступа
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Дата 3 дня назад
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

    // Находим всех клиентов с их активными практиками
    const clients = await prisma.client.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            emailNotifications: true,
            notifyPracticeDiary: true,
          },
        },
        practices: {
          where: {
            isAssigned: true,
            completedAt: null, // Незавершенные практики
          },
          select: {
            id: true,
            title: true,
            notes: true,
            updatedAt: true,
          },
        },
      },
    })

    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Отправляем напоминания клиентам с незаполненными практиками
    for (const client of clients) {
      try {
        // Считаем практики без заметок или с давними заметками
        const incompletePractices = client.practices.filter((practice) => {
          return !practice.notes || practice.notes.trim() === '' || practice.updatedAt < threeDaysAgo
        })

        // Пропускаем, если нет незаполненных практик
        if (incompletePractices.length === 0) {
          continue
        }

        const clientUser = client.user

        if (!clientUser.email) {
          console.info(`Client ${clientUser.id} has no email, skipping`)
          continue
        }

        // Находим дату последней записи (самая свежая updatedAt среди практик с заметками)
        const practicesWithNotes = client.practices.filter((p) => p.notes && p.notes.trim() !== '')

        const lastEntryDate =
          practicesWithNotes.length > 0
            ? new Date(Math.max(...practicesWithNotes.map((p) => p.updatedAt.getTime())))
            : undefined

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

        await sendPracticeDiaryReminderEmail(
          clientUser.email,
          {
            clientName: clientUser.name || 'Уважаемый клиент',
            incompletePracticesCount: incompletePractices.length,
            lastEntryDate,
            practicesUrl: `${baseUrl}/practices`,
          },
          {
            emailNotifications: clientUser.emailNotifications,
            notifyPracticeDiary: clientUser.notifyPracticeDiary,
          }
        )

        sentCount++
        console.info(
          `Sent practice diary reminder to ${clientUser.email} (${incompletePractices.length} incomplete practices)`
        )
      } catch (emailError) {
        failedCount++
        const errorMsg = `Failed to send diary reminder to client ${client.id}: ${emailError}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    return NextResponse.json({
      success: true,
      totalClients: clients.length,
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Practice diary reminders cron job failed:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
