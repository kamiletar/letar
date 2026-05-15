/**
 * Calendar Settings Page
 *
 * Страница настроек синхронизации календарей:
 * - iCal Feed (readonly URL для подписки)
 * - Google Calendar (двусторонняя синхронизация)
 */

import { Container, Heading, Separator, Stack, Text } from '@chakra-ui/react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { getSession } from '@/lib/auth'
import { getOrCreateCalendarFeed } from '@/lib/calendar'
import { prisma } from '@/lib/db'
import { CalendarConnectionsSection } from './_components/calendar-connections-section'
import { CalendarFeedSection } from './_components/calendar-feed-section'

export const metadata: Metadata = {
  title: 'Настройки календаря',
  description: 'Синхронизация расписания с внешними календарями',
}

export default async function CalendarSettingsPage() {
  const session = await getSession()

  if (!session?.user?.id) {
    redirect('/sign-in')
  }

  // Получаем или создаём feed для пользователя
  const feed = await getOrCreateCalendarFeed(session.user.id)

  // Получаем подключённые календари
  const connections = await prisma.calendarConnection.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      provider: true,
      calendarName: true,
      syncDirection: true,
      syncStatus: true,
      lastSyncAt: true,
      lastSyncError: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  // Определяем base URL для формирования ссылки
  const headersList = await headers()
  const host = headersList.get('host') || 'localhost:3003'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const baseUrl = `${protocol}://${host}`

  return (
    <Container maxW="container.md" py={8}>
      <Stack gap={8}>
        <Stack gap={2}>
          <Heading size="xl">Настройки календаря</Heading>
          <Text color="fg.muted">
            Синхронизируйте расписание с Google Calendar, Apple Calendar, Яндекс Календарём и другими приложениями
          </Text>
        </Stack>

        {/* iCal Feed — readonly подписка */}
        <CalendarFeedSection feed={feed} baseUrl={baseUrl} />

        <Separator />

        {/* Google Calendar — двусторонняя синхронизация */}
        <CalendarConnectionsSection initialConnections={connections} />
      </Stack>
    </Container>
  )
}
