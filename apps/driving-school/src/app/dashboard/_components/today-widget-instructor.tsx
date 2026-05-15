/**
 * Виджет "Сегодня" для инструктора
 *
 * Показывает занятия на сегодня, ожидающие подтверждения и быстрые действия
 *
 * @module today-widget-instructor
 */

import { prisma } from '@/lib/db'
import { Badge, Box, Button, Card, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { LuCalendar, LuCheck, LuClock, LuHourglass, LuPlus, LuUser } from 'react-icons/lu'

import { LESSON_STATUS_CONFIG, StatusBadge } from '@/app/_components/status-badge'

interface TodayWidgetInstructorProps {
  userId: string
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
 * Виджет "Сегодня" для инструктора
 *
 * Отображает:
 * - Занятия на сегодня (список с временем и учениками)
 * - Количество ожидающих подтверждения
 * - Быстрые действия (открыть расписание, добавить слот)
 */
export async function TodayWidgetInstructor({ userId }: TodayWidgetInstructorProps) {
  // Границы сегодняшнего дня
  const now = new Date()
  const todayStart = new Date(now)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(now)
  todayEnd.setHours(23, 59, 59, 999)

  // Получаем занятия на сегодня
  const todayLessons = await prisma.lesson.findMany({
    where: {
      instructorId: userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      slot: {
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    },
    include: {
      slot: {
        select: {
          startTime: true,
          endTime: true,
        },
      },
      student: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      slot: {
        startTime: 'asc',
      },
    },
    take: 5, // Показываем максимум 5 занятий
  })

  // Количество ожидающих подтверждения
  const pendingCount = await prisma.lesson.count({
    where: {
      instructorId: userId,
      status: 'PENDING',
    },
  })

  // Общее количество занятий на сегодня
  const totalTodayCount = await prisma.lesson.count({
    where: {
      instructorId: userId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      slot: {
        startTime: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    },
  })

  // Ближайшее занятие (первое после текущего времени)
  const nextLesson = todayLessons.find((l) => new Date(l.slot.startTime) > now)

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
                {totalTodayCount} занятий
              </Badge>
              {pendingCount > 0 && (
                <Badge colorPalette="orange" size="sm">
                  <LuHourglass size={12} />
                  {pendingCount} ожидают
                </Badge>
              )}
            </HStack>
          </Flex>

          {/* Занятия на сегодня */}
          {todayLessons.length > 0 ? (
            <VStack gap={2} align="stretch">
              {todayLessons.map((lesson) => {
                const isNext = nextLesson?.id === lesson.id
                const isPast = new Date(lesson.slot.endTime) < now

                return (
                  <Box
                    key={lesson.id}
                    p={3}
                    bg={isNext ? 'brand.50' : 'bg'}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={isNext ? 'brand.200' : 'border'}
                    opacity={isPast ? 0.6 : 1}
                    _dark={{
                      bg: isNext ? 'brand.900/20' : 'bg',
                      borderColor: isNext ? 'brand.700' : 'border',
                    }}
                  >
                    <Flex justify="space-between" align="center" gap={4}>
                      <HStack gap={3} flex={1}>
                        <HStack gap={1} minW="90px">
                          <LuClock size={14} />
                          <Text fontSize="sm" fontWeight={isNext ? 'bold' : 'normal'}>
                            {formatTime(lesson.slot.startTime)}
                          </Text>
                        </HStack>
                        <HStack gap={1} flex={1}>
                          <LuUser size={14} />
                          <Text fontSize="sm" truncate>
                            {lesson.student.name || lesson.student.email}
                          </Text>
                        </HStack>
                      </HStack>
                      <StatusBadge config={LESSON_STATUS_CONFIG} status={lesson.status as 'PENDING' | 'CONFIRMED'} />
                    </Flex>
                    {isNext && (
                      <Text fontSize="xs" color="brand.600" mt={1} _dark={{ color: 'brand.300' }}>
                        Ближайшее занятие
                      </Text>
                    )}
                  </Box>
                )
              })}

              {totalTodayCount > 5 && (
                <Text fontSize="sm" color="fg.muted" textAlign="center">
                  И ещё {totalTodayCount - 5} занятий...
                </Text>
              )}
            </VStack>
          ) : (
            <Box p={4} bg="bg" borderRadius="lg" borderWidth="1px" textAlign="center">
              <VStack gap={3}>
                <Text color="fg.muted">На сегодня занятий нет</Text>
                <Button asChild colorPalette="brand" size="sm">
                  <Link href="/schedule">
                    <LuPlus size={16} />
                    Открыть расписание
                  </Link>
                </Button>
              </VStack>
            </Box>
          )}

          {/* Ожидающие подтверждения */}
          {pendingCount > 0 && (
            <Box
              p={3}
              bg="orange.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="orange.200"
              _dark={{ bg: 'orange.900/20', borderColor: 'orange.700' }}
            >
              <Flex justify="space-between" align="center">
                <HStack gap={2}>
                  <LuHourglass size={16} color="var(--chakra-colors-orange-500)" />
                  <Text fontSize="sm" fontWeight="medium">
                    {pendingCount} заявок ожидают подтверждения
                  </Text>
                </HStack>
                <Button asChild size="xs" colorPalette="orange" variant="ghost">
                  <Link href="/lessons?status=PENDING">
                    <LuCheck size={14} />
                    Проверить
                  </Link>
                </Button>
              </Flex>
            </Box>
          )}

          {/* Быстрые действия */}
          <Flex gap={2} flexWrap="wrap">
            <Button asChild size="sm" variant="ghost">
              <Link href="/schedule">Расписание</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/lessons">Все занятия</Link>
            </Button>
            <Button asChild size="sm" variant="ghost">
              <Link href="/students">Ученики</Link>
            </Button>
          </Flex>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
