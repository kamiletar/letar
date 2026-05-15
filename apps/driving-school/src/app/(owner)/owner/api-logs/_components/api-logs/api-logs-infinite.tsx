'use client'

/**
 * Компонент бесконечного списка API-логов
 *
 * Позволяет просматривать и фильтровать логи API запросов,
 * а также выполнять ротацию старых записей.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { useInfiniteFindManyApiLog } from '@/lib/hooks'
import { Box, Button, Card, EmptyState, Heading, HStack, Spinner, Text, VStack } from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { LuChevronDown, LuFileText, LuRefreshCw, LuTrash2 } from 'react-icons/lu'

import { ApiLogsFilters } from './api-logs-filters'
import { ApiLogsTable } from './api-logs-table'
import { ITEMS_PER_PAGE } from './constants'
import type { ApiLogsInfiniteProps, ApiLogWithRelations } from './types'
import { useApiLogsFilters } from './use-api-logs-filters'

/**
 * Главный компонент бесконечного списка логов
 */
export function ApiLogsInfinite({ organizations }: ApiLogsInfiniteProps) {
  // Фильтры
  const {
    organizationFilter,
    endpointFilter,
    statusFilter,
    setOrganizationFilter,
    setEndpointFilter,
    setStatusFilter,
    whereConditions,
  } = useApiLogsFilters()

  // Ротация
  const [isRotating, setIsRotating] = useState(false)

  // Запрос логов через Infinite Query
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading, error, refetch } = useInfiniteFindManyApiLog(
    {
      where: whereConditions,
      include: {
        apiKey: {
          select: {
            id: true,
            name: true,
            keyPrefix: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: ITEMS_PER_PAGE,
    },
    {
      getNextPageParam: (lastPage, allPages) => {
        if (lastPage.length < ITEMS_PER_PAGE) {
          return undefined
        }
        return allPages.length * ITEMS_PER_PAGE
      },
      refetchOnWindowFocus: true,
    }
  )

  // Объединяем все страницы в один массив
  const allLogs = useMemo(() => {
    if (!data?.pages) {
      return []
    }
    return data.pages.flat() as unknown as ApiLogWithRelations[]
  }, [data])

  // Ротация логов
  const handleRotateLogs = async () => {
    if (!confirm('Удалить логи старше 30 дней?')) {
      return
    }

    setIsRotating(true)

    try {
      const response = await fetch('/api/owner/api-logs', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ olderThanDays: 30 }),
      })
      const result = await response.json()

      if (response.ok) {
        toaster.success({
          title: 'Ротация завершена',
          description: `Удалено ${result.deleted} записей`,
        })
        refetch()
      } else {
        toaster.error({ title: result.error || 'Ошибка ротации' })
      }
    } catch {
      toaster.error({ title: 'Ошибка соединения' })
    }

    setIsRotating(false)
  }

  return (
    <VStack gap={6} align="stretch">
      {/* Заголовок */}
      <HStack justify="space-between">
        <Box>
          <Heading size="lg">Логи API</Heading>
          <Text fontSize="sm" color="fg.muted">
            Журнал всех API запросов к платформе
          </Text>
        </Box>

        <HStack>
          <Button onClick={() => refetch()} variant="outline" size="sm" disabled={isLoading}>
            <LuRefreshCw />
            Обновить
          </Button>
          <Button onClick={handleRotateLogs} variant="outline" size="sm" disabled={isRotating} colorPalette="red">
            <LuTrash2 />
            {isRotating ? 'Удаление...' : 'Ротация'}
          </Button>
        </HStack>
      </HStack>

      {/* Фильтры */}
      <ApiLogsFilters
        organizations={organizations}
        organizationFilter={organizationFilter}
        endpointFilter={endpointFilter}
        statusFilter={statusFilter}
        onOrganizationChange={setOrganizationFilter}
        onEndpointChange={setEndpointFilter}
        onStatusChange={setStatusFilter}
      />

      {/* Статистика */}
      {!isLoading && (
        <HStack justify="space-between" fontSize="sm" color="fg.muted">
          <Text>
            Загружено записей: <strong>{allLogs.length}</strong>
          </Text>
        </HStack>
      )}

      {/* Состояние загрузки */}
      {isLoading && (
        <Card.Root>
          <Card.Body>
            <VStack gap={4} py={8}>
              <Spinner size="lg" />
              <Text color="fg.muted">Загрузка логов...</Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      )}

      {/* Ошибка */}
      {error && (
        <Card.Root>
          <Card.Body>
            <Text color="fg.error">Ошибка загрузки логов</Text>
          </Card.Body>
        </Card.Root>
      )}

      {/* Таблица логов */}
      {!isLoading && !error && (
        <Card.Root>
          <Card.Body p={0}>
            {allLogs.length === 0 ? (
              <EmptyState.Root>
                <EmptyState.Content>
                  <EmptyState.Indicator>
                    <LuFileText />
                  </EmptyState.Indicator>
                  <VStack textAlign="center">
                    <EmptyState.Title>Логи не найдены</EmptyState.Title>
                    <EmptyState.Description>Нет записей соответствующих фильтрам</EmptyState.Description>
                  </VStack>
                </EmptyState.Content>
              </EmptyState.Root>
            ) : (
              <ApiLogsTable logs={allLogs} />
            )}
          </Card.Body>
        </Card.Root>
      )}

      {/* Кнопка загрузки ещё */}
      {!isLoading && !error && hasNextPage && (
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
    </VStack>
  )
}
