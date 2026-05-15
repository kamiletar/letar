'use client'

/**
 * Секция "Сегодня" для Manager Dashboard
 *
 * Компактный обзор текущего дня:
 * - Занятия (всего, отменено, предстоит)
 * - Экзамены (внутренние, ГИБДД)
 * - Ожидаемые платежи
 *
 * @module today-section
 */

import { Badge, Box, Card, Heading, HStack, Icon, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuBanknote, LuCalendarCheck, LuGraduationCap } from 'react-icons/lu'
import type { TodaySectionData } from '../_actions/dashboard.action'

// === Типы ===

interface TodaySectionProps {
  data: TodaySectionData
}

// === Вспомогательные компоненты ===

interface StatItemProps {
  label: string
  value: number | string
  colorPalette?: string
}

function StatItem({ label, value, colorPalette = 'gray' }: StatItemProps) {
  return (
    <HStack justify="space-between">
      <Text fontSize="sm" color="fg.muted">
        {label}
      </Text>
      <Badge colorPalette={colorPalette} size="sm" variant="subtle">
        {value}
      </Badge>
    </HStack>
  )
}

// === Карточка занятий ===

interface TodayLessonsCardProps {
  total: number
  completed: number
  cancelled: number
  upcoming: number
}

function TodayLessonsCard({ total, completed, cancelled, upcoming }: TodayLessonsCardProps) {
  return (
    <Card.Root>
      <Card.Body p={4}>
        <VStack gap={3} align="stretch">
          <HStack gap={2}>
            <Box p={2} bg="blue.100" borderRadius="md" _dark={{ bg: 'blue.900/30' }}>
              <Icon as={LuCalendarCheck} boxSize={5} color="blue.600" _dark={{ color: 'blue.300' }} />
            </Box>
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Занятия
              </Text>
              <Heading size="lg" lineHeight={1}>
                {total}
              </Heading>
            </Box>
          </HStack>

          <VStack gap={1} align="stretch">
            <StatItem label="Завершено" value={completed} colorPalette="green" />
            <StatItem label="Предстоит" value={upcoming} colorPalette="blue" />
            {cancelled > 0 && <StatItem label="Отменено" value={cancelled} colorPalette="red" />}
          </VStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

// === Карточка экзаменов ===

interface TodayExamsCardProps {
  total: number
  internal: number
  gibdd: number
}

function TodayExamsCard({ total, internal, gibdd }: TodayExamsCardProps) {
  return (
    <Card.Root>
      <Card.Body p={4}>
        <VStack gap={3} align="stretch">
          <HStack gap={2}>
            <Box p={2} bg="purple.100" borderRadius="md" _dark={{ bg: 'purple.900/30' }}>
              <Icon as={LuGraduationCap} boxSize={5} color="purple.600" _dark={{ color: 'purple.300' }} />
            </Box>
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Экзамены
              </Text>
              <Heading size="lg" lineHeight={1}>
                {total}
              </Heading>
            </Box>
          </HStack>

          {total > 0 ? (
            <VStack gap={1} align="stretch">
              {internal > 0 && <StatItem label="Внутренние" value={internal} colorPalette="purple" />}
              {gibdd > 0 && <StatItem label="ГИБДД" value={gibdd} colorPalette="orange" />}
            </VStack>
          ) : (
            <Text fontSize="sm" color="fg.muted">
              Экзаменов на сегодня нет
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

// === Карточка платежей ===

interface TodayPaymentsCardProps {
  amount: number
  studentsCount: number
}

function TodayPaymentsCard({ amount, studentsCount }: TodayPaymentsCardProps) {
  const formattedAmount = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(amount)

  return (
    <Card.Root>
      <Card.Body p={4}>
        <VStack gap={3} align="stretch">
          <HStack gap={2}>
            <Box p={2} bg="green.100" borderRadius="md" _dark={{ bg: 'green.900/30' }}>
              <Icon as={LuBanknote} boxSize={5} color="green.600" _dark={{ color: 'green.300' }} />
            </Box>
            <Box>
              <Text fontSize="sm" color="fg.muted">
                Оплата занятий
              </Text>
              <Heading size="lg" lineHeight={1}>
                {formattedAmount}
              </Heading>
            </Box>
          </HStack>

          <StatItem
            label="Учеников на занятиях"
            value={studentsCount}
            colorPalette={studentsCount > 0 ? 'green' : 'gray'}
          />
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

// === Основной компонент ===

export function TodaySection({ data }: TodaySectionProps) {
  return (
    <Box>
      <Heading size="md" mb={4}>
        Сегодня
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
        <TodayLessonsCard
          total={data.lessons.total}
          completed={data.lessons.completed}
          cancelled={data.lessons.cancelled}
          upcoming={data.lessons.upcoming}
        />

        <TodayExamsCard total={data.exams.total} internal={data.exams.internal} gibdd={data.exams.gibdd} />

        <TodayPaymentsCard amount={data.payments.amount} studentsCount={data.payments.studentsCount} />
      </SimpleGrid>
    </Box>
  )
}
