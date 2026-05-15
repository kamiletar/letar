/* eslint-disable no-console */
export const dynamic = 'force-dynamic'

import { PrismaClient } from '@/generated/prisma/client'
import { sendSessionReminderEmail } from '@/lib/email'
import { PrismaPg } from '@prisma/adapter-pg'
import { NextResponse } from 'next/server'

/**
 * API Route для проверки предстоящих сессий и отправки напоминаний
 *
 * Проверяет сессии, которые:
 * - Запланированы на завтра (через 20-28 часов)
 * - В статусе SCHEDULED
 * - Еще не отправлено напоминание
 *
 * Использование:
 * - Вызывать через cron job (например, раз в день в 10:00)
 * - Или через внешний сервис типа cron-job.org
 * - Или вручную: GET /api/cron/session-reminders?secret=YOUR_SECRET
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

    // Вычисляем временной диапазон: завтра (через 20-28 часов от текущего момента)
    const now = new Date()
    const twentyHoursFromNow = new Date(now.getTime() + 20 * 60 * 60 * 1000)
    const twentyEightHoursFromNow = new Date(now.getTime() + 28 * 60 * 60 * 1000)

    // Находим сессии, которые запланированы на завтра
    const upcomingSessions = await prisma.therapySession.findMany({
      where: {
        scheduledAt: {
          gte: twentyHoursFromNow,
          lte: twentyEightHoursFromNow,
        },
        status: 'SCHEDULED',
      },
      include: {
        client: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                emailNotifications: true,
                notifySessionReminders: true,
              },
            },
          },
        },
        specialist: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    let sentCount = 0
    let failedCount = 0
    const errors: string[] = []

    // Отправляем напоминания для каждой найденной сессии
    for (const session of upcomingSessions) {
      try {
        const clientUser = session.client.user

        if (!clientUser.email) {
          console.info(`Client ${clientUser.id} has no email, skipping`)
          continue
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'

        await sendSessionReminderEmail(
          clientUser.email,
          {
            clientName: clientUser.name || 'Уважаемый клиент',
            specialistName: session.specialist.name || 'ваш специалист',
            sessionDate: session.scheduledAt,
            sessionType: session.topic || 'Консультация',
            notes: session.notes || undefined,
            meetingUrl: session.meetingUrl || undefined,
            dashboardUrl: `${baseUrl}/dashboard`,
          },
          {
            emailNotifications: clientUser.emailNotifications,
            notifySessionReminders: clientUser.notifySessionReminders,
          }
        )

        sentCount++
        console.info(`Sent reminder for session ${session.id} to ${clientUser.email}`)
      } catch (emailError) {
        failedCount++
        const errorMsg = `Failed to send reminder for session ${session.id}: ${emailError}`
        console.error(errorMsg)
        errors.push(errorMsg)
      }
    }

    return NextResponse.json({
      success: true,
      totalSessions: upcomingSessions.length,
      sentCount,
      failedCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Session reminders cron job failed:', error)

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
