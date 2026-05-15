'use client'

import { Box, Button, Card, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState, useTransition } from 'react'
import { LuRefreshCw, LuTable } from 'react-icons/lu'

import {
  getKanbanDataAction,
  type InstructorOption,
  type KanbanData,
  type KanbanFilters,
} from '../_actions/kanban.action'
import { KanbanBoard } from './kanban-board'
import { KanbanFiltersBar } from './kanban-filters'
import { KanbanStats } from './kanban-stats'

interface KanbanPageClientProps {
  schoolId: string
  initialData: KanbanData
  initialInstructors: InstructorOption[]
}

/**
 * Клиентский компонент страницы Kanban
 * Управляет фильтрами и обновлением данных
 */
export function KanbanPageClient({ schoolId, initialData, initialInstructors }: KanbanPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [data, setData] = useState(initialData)
  const [instructors] = useState(initialInstructors)
  const [isPending, startTransition] = useTransition()
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Инициализируем фильтры из URL
  const [filters, setFilters] = useState<KanbanFilters>(() => ({
    search: searchParams.get('search') || undefined,
    category: (searchParams.get('category') as KanbanFilters['category']) || undefined,
    instructorId: searchParams.get('instructorId') || undefined,
  }))

  // Обновляем URL при изменении фильтров
  const updateUrl = useCallback(
    (newFilters: KanbanFilters) => {
      const params = new URLSearchParams()
      if (newFilters.search) {
        params.set('search', newFilters.search)
      }
      if (newFilters.category) {
        params.set('category', newFilters.category)
      }
      if (newFilters.instructorId) {
        params.set('instructorId', newFilters.instructorId)
      }

      const queryString = params.toString()
      router.replace(`/school/progress/kanban?schoolId=${schoolId}${queryString ? `&${queryString}` : ''}`, {
        scroll: false,
      })
    },
    [router, schoolId]
  )

  // Загружаем данные при изменении фильтров
  const loadData = useCallback(
    async (filtersToUse: KanbanFilters) => {
      startTransition(async () => {
        const result = await getKanbanDataAction(schoolId, filtersToUse)
        if (result.success) {
          setData(result.data)
        }
      })
    },
    [schoolId]
  )

  // Обработчик изменения фильтров (с debounce для поиска)
  const handleFilterChange = useCallback(
    (newFilters: KanbanFilters) => {
      setFilters(newFilters)
      updateUrl(newFilters)
      loadData(newFilters)
    },
    [updateUrl, loadData]
  )

  // Обновление данных
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await loadData(filters)
    setIsRefreshing(false)
  }, [loadData, filters])

  return (
    <VStack align="stretch" gap={4}>
      {/* Заголовок и переключатель вида */}
      <HStack justify="space-between" wrap="wrap" gap={3}>
        <HStack gap={3}>
          <Text fontSize="xl" fontWeight="semibold">
            Kanban-доска
          </Text>
          <KanbanStats stats={data.stats} />
        </HStack>

        <HStack gap={2}>
          {/* Кнопка обновления */}
          <Button variant="ghost" size="sm" onClick={handleRefresh} loading={isRefreshing}>
            <LuRefreshCw />
          </Button>

          {/* Переключатель на табличный вид */}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/school/progress/${schoolId}`}>
              <LuTable />
              <Text display={{ base: 'none', md: 'inline' }}>Таблица</Text>
            </Link>
          </Button>
        </HStack>
      </HStack>

      {/* Фильтры */}
      <Card.Root variant="outline" size="sm">
        <Card.Body py={3}>
          <KanbanFiltersBar filters={filters} instructors={instructors} onFilterChange={handleFilterChange} />
        </Card.Body>
      </Card.Root>

      {/* Kanban-доска */}
      <Box position="relative">
        {isPending && (
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="bg/80"
            zIndex={10}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Spinner size="lg" />
          </Box>
        )}

        <KanbanBoard initialData={data} schoolId={schoolId} />
      </Box>
    </VStack>
  )
}
