import { prisma } from '@/lib/prisma'
import { Heading, HStack, VStack } from '@chakra-ui/react'
import { AvailabilityRulesTable, BookedSlotsTable } from './_components'

interface SlotsPageProps {
  params: Promise<{ locale: string }>
}

/**
 * Управление слотами бронирования
 */
export default async function SlotsPage({ params }: SlotsPageProps) {
  const { locale } = await params

  // Получаем будущие слоты
  // oxlint-disable-next-line react/purity -- серверный компонент: время запроса
  const now = new Date()
  const upcomingSlots = await prisma.bookedSlot.findMany({
    where: {
      startAt: { gte: now },
    },
    orderBy: { startAt: 'asc' },
    include: {
      request: {
        select: {
          name: true,
          email: true,
          serviceType: true,
        },
      },
    },
  })

  // Получаем правила доступности
  const availabilityRules = await prisma.availabilityRule.findMany({
    orderBy: { dayOfWeek: 'asc' },
  })

  return (
    <VStack gap={8} align="stretch">
      <HStack justify="space-between">
        <Heading size="xl">Слоты и расписание</Heading>
      </HStack>

      <AvailabilityRulesTable locale={locale} rules={availabilityRules} />

      <BookedSlotsTable locale={locale} slots={upcomingSlots} />
    </VStack>
  )
}
