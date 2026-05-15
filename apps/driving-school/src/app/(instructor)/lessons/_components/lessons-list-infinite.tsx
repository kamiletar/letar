'use client'

import { AppEmptyState } from '@/app/_components/empty-state'
import { LessonCardSkeleton } from '@/app/_components/skeletons'
import { Box, Button, Container, Heading, SimpleGrid, Spinner, Text, VStack } from '@chakra-ui/react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { LuCalendar, LuChevronDown, LuSearch } from 'react-icons/lu'
import { getInstructorLessonsPaginated, type LessonWithDetails } from '../_actions/lesson.action'
import { LessonCard } from './lesson-card'
import { LessonsFilter } from './lessons-filter'

interface LessonsListInfiniteProps {
  statusFilter?: string
  initialInstructorId: string
}

const ITEMS_PER_PAGE = 20

export function LessonsListInfinite({
  statusFilter,
  initialInstructorId: _initialInstructorId,
}: LessonsListInfiniteProps) {
  // Запрос занятий через Infinite Query с Server Action
  // ZenStack v3.2.1 баг: useInfiniteFindManyLesson с include генерирует невалидный SQL
  // Workaround: используем Server Action напрямую
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error } = useInfiniteQuery({
    queryKey: ['instructor-lessons', statusFilter],
    queryFn: async ({ pageParam = 0 }) => {
      const result = await getInstructorLessonsPaginated({
        statusFilter,
        cursor: pageParam as number,
        take: ITEMS_PER_PAGE,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      return result
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) {
        return undefined
      }
      return allPages.length * ITEMS_PER_PAGE
    },
    initialPageParam: 0,
    // Отключаем автообновление при фокусе окна для экономии памяти
    // (перезагрузка всех страниц при переключении окна)
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 минут кэш
    gcTime: 10 * 60 * 1000, // 10 минут garbage collection
  })

  // Объединяем все страницы в один массив
  const allLessons = useMemo(() => {
    if (!data?.pages) {
      return []
    }
    return data.pages.flatMap((page) => page.lessons) as LessonWithDetails[]
  }, [data])

  // Группировка и статистика за один проход (вместо 7 filter)
  const { upcomingLessons, pastLessons, stats } = useMemo(() => {
    const now = new Date()

    // Один проход вместо множественных filter O(7n) → O(n)
    const result = allLessons.reduce(
      (acc, lesson) => {
        // Группировка по времени
        const isUpcoming = new Date(lesson.slot.startTime) >= now
        if (isUpcoming) {
          acc.upcoming.push(lesson)
        } else {
          acc.past.push(lesson)
        }

        // Подсчёт статистики в том же проходе
        const status = lesson.status
        if (status === 'PENDING') {
          acc.stats.pending++
        } else if (status === 'CONFIRMED') {
          acc.stats.confirmed++
        } else if (status === 'COMPLETED') {
          acc.stats.completed++
        } else if (status === 'CANCELLED') {
          acc.stats.cancelled++
        } else if (status === 'NO_SHOW') {
          acc.stats.noShow++
        }

        return acc
      },
      {
        upcoming: [] as LessonWithDetails[],
        past: [] as LessonWithDetails[],
        stats: { pending: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0 },
      }
    )

    return {
      upcomingLessons: result.upcoming,
      pastLessons: result.past,
      stats: result.stats,
    }
  }, [allLessons])

  // Состояние загрузки
  if (isLoading) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack gap={6} align="stretch" role="status" aria-live="polite" aria-busy="true">
          <Box>
            <Heading size="xl">Мои занятия</Heading>
            <Text color="fg.muted" mt={2}>
              Загрузка занятий...
            </Text>
          </Box>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
            {Array.from({ length: 4 }).map((_, i) => (
              <LessonCardSkeleton key={`skeleton-${i}`} />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>
    )
  }

  // Ошибка
  if (error) {
    return (
      <Container maxW="container.lg" py={8}>
        <VStack gap={6} align="stretch" role="alert" aria-live="assertive">
          <Box layerStyle="panel.error" p={6} borderRadius="lg" textAlign="center">
            <Heading size="lg" color="error.fg">
              Ошибка
            </Heading>
            <Text color="error.fg" mt={2}>
              Не удалось загрузить занятия
            </Text>
          </Box>
        </VStack>
      </Container>
    )
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack gap={6} align="stretch">
        {/* Заголовок */}
        <Box>
          <Heading size="xl">Мои занятия</Heading>
          <Text color="fg.muted" mt={2}>
            Управление расписанием и занятиями
          </Text>
        </Box>

        {/* Фильтр и статистика */}
        <LessonsFilter stats={stats} currentFilter={statusFilter} />

        {/* Предстоящие занятия */}
        {upcomingLessons.length > 0 && (
          <Box>
            <Heading size="md" mb={4}>
              Предстоящие занятия ({upcomingLessons.length})
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {upcomingLessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Прошедшие занятия */}
        {pastLessons.length > 0 && (
          <Box>
            <Heading size="md" mb={4} color="fg.muted">
              Прошедшие занятия ({pastLessons.length})
            </Heading>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4}>
              {pastLessons.map((lesson) => (
                <LessonCard key={lesson.id} lesson={lesson} />
              ))}
            </SimpleGrid>
          </Box>
        )}

        {/* Кнопка загрузки ещё */}
        {hasNextPage && (
          <Box textAlign="center">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              colorPalette="brand"
              variant="outline"
              size="lg"
            >
              {isFetchingNextPage ? (
                <>
                  <Spinner size="sm" />
                  Загрузка...
                </>
              ) : (
                <>
                  <LuChevronDown />
                  Загрузить ещё
                </>
              )}
            </Button>
          </Box>
        )}

        {/* Пустое состояние */}
        {allLessons.length === 0 && (
          <AppEmptyState
            title={
              statusFilter && statusFilter !== 'ALL' ? 'Нет занятий с выбранным статусом' : 'У вас пока нет занятий'
            }
            description={
              statusFilter && statusFilter !== 'ALL'
                ? 'Попробуйте изменить фильтр или подождите новых записей'
                : 'Когда ученики запишутся на занятия, они появятся здесь'
            }
            icon={statusFilter && statusFilter !== 'ALL' ? <LuSearch /> : <LuCalendar />}
            role="status"
            aria-live="polite"
          />
        )}
      </VStack>
    </Container>
  )
}
