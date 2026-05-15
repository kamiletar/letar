/**
 * Виджет "Сегодня" для ученика
 *
 * Показывает ближайшее занятие и быстрые действия
 *
 * @module today-widget-student
 */

import { prisma } from '@/lib/db'
import { Badge, Box, Button, Card, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuCalendar, LuCar, LuClock, LuSearch, LuUser } from 'react-icons/lu'

import { LESSON_STATUS_CONFIG, StatusBadge } from '@/app/_components/status-badge'

interface TodayWidgetStudentProps {
  userId: string
}

/**
 * Форматирование даты занятия
 */
function formatLessonDate(date: Date): string {
  const now = new Date()
  const lessonDate = new Date(date)

  // Проверяем, сегодня ли занятие
  const isToday =
    lessonDate.getDate() === now.getDate() &&
    lessonDate.getMonth() === now.getMonth() &&
    lessonDate.getFullYear() === now.getFullYear()

  // Проверяем, завтра ли занятие
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow =
    lessonDate.getDate() === tomorrow.getDate() &&
    lessonDate.getMonth() === tomorrow.getMonth() &&
    lessonDate.getFullYear() === tomorrow.getFullYear()

  if (isToday) {
    return 'Сегодня'
  }
  if (isTomorrow) {
    return 'Завтра'
  }

  return lessonDate.toLocaleDateString('ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })
}

/**
 * Форматирование времени
 */
function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Виджет "Сегодня" для ученика
 *
 * Отображает:
 * - Ближайшее занятие (статус, время, инструктор)
 * - Быстрые действия (записаться, посмотреть занятия)
 */
export async function TodayWidgetStudent({ userId }: TodayWidgetStudentProps) {
  // Получаем ближайшее активное занятие
  const now = new Date()

  const nextLesson = await prisma.lesson.findFirst({
    where: {
      studentId: userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      slot: {
        startTime: { gte: now },
      },
    },
    include: {
      slot: {
        select: {
          startTime: true,
          endTime: true,
        },
      },
      instructor: {
        select: {
          name: true,
          email: true,
          instructorProfile: {
            select: {
              vehicles: {
                where: { isPrimary: true, isActive: true },
                take: 1,
                select: {
                  brand: true,
                  model: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      slot: {
        startTime: 'asc',
      },
    },
  })

  // Получаем количество активных занятий
  const activeCount = await prisma.lesson.count({
    where: {
      studentId: userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
  })

  // Получаем количество завершённых занятий
  const completedCount = await prisma.lesson.count({
    where: {
      studentId: userId,
      status: 'COMPLETED',
    },
  })

  const primaryVehicle = nextLesson?.instructor?.instructorProfile?.vehicles?.[0]

  return (
    <Card.Root
      borderWidth="2px"
      borderColor="brand.500"
      bg="bg.subtle"
      _dark={{ bg: 'gray.800', borderColor: 'brand.400' }}
    >
      <Card.Body>
        <VStack gap={4} align="stretch">
          {/* Заголовок */}
          <Flex justify="space-between" align="center">
            <HStack gap={2}>
              <LuCalendar size={20} />
              <Heading size="md">Сегодня</Heading>
            </HStack>
            <HStack gap={2}>
              <Badge colorPalette="blue" size="sm">
                {activeCount} активных
              </Badge>
              <Badge colorPalette="green" size="sm">
                {completedCount} завершено
              </Badge>
            </HStack>
          </Flex>

          {/* Ближайшее занятие или заглушка */}
          {nextLesson ? (
            <Box p={4} bg="bg" borderRadius="lg" borderWidth="1px">
              <VStack gap={3} align="stretch">
                <Flex justify="space-between" align="center">
                  <Text fontWeight="bold" fontSize="lg">
                    {formatLessonDate(nextLesson.slot.startTime)}
                  </Text>
                  <StatusBadge config={LESSON_STATUS_CONFIG} status={nextLesson.status as 'PENDING' | 'CONFIRMED'} />
                </Flex>

                <HStack gap={4} color="fg.muted">
                  <HStack gap={1}>
                    <LuClock size={16} />
                    <Text fontSize="sm">
                      {formatTime(nextLesson.slot.startTime)} – {formatTime(nextLesson.slot.endTime)}
                    </Text>
                  </HStack>
                </HStack>

                <HStack gap={4}>
                  <HStack gap={1}>
                    <LuUser size={16} />
                    <Text fontSize="sm">{nextLesson.instructor.name || nextLesson.instructor.email}</Text>
                  </HStack>
                  {primaryVehicle && (
                    <HStack gap={1} color="fg.muted">
                      <LuCar size={16} />
                      <Text fontSize="sm">
                        {primaryVehicle.brand} {primaryVehicle.model}
                      </Text>
                    </HStack>
                  )}
                </HStack>

                <Button asChild size="sm" variant="outline" mt={2}>
                  <Link href="/my-lessons">Все занятия →</Link>
                </Button>
              </VStack>
            </Box>
          ) : (
            <Box p={4} bg="bg" borderRadius="lg" borderWidth="1px" textAlign="center">
              <VStack gap={3}>
                <Text color="fg.muted">Нет запланированных занятий</Text>
                <Button asChild colorPalette="brand" size="sm">
                  <Link href="/my-schedule">
                    <LuSearch size={16} />
                    Записаться на занятие
                  </Link>
                </Button>
              </VStack>
            </Box>
          )}

          {/* Быстрые действия */}
          <Flex gap={2} flexWrap="wrap">
            <Button asChild size="sm" variant="ghost">
              <Link href="/my-lessons">Мои занятия</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/my-instructors">Инструкторы</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/instructors">Найти инструктора</Link>
            </Button>
          </Flex>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
