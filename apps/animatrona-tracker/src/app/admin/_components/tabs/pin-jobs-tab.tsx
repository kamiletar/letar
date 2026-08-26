'use client'

/**
 * Вкладка заданий на пиннинг
 *
 * Два отдельных запроса:
 * 1. Активные (PINNING/QUEUED) — polling каждые 5 сек
 * 2. Завершённые (PINNED/FAILED/UNPINNED) — offset infinite scroll, без polling
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Center, HStack, Skeleton, SkeletonText, Spinner, Text, VStack } from '@chakra-ui/react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LuPin, LuRefreshCw, LuShieldAlert, LuTrash2 } from 'react-icons/lu'

import { PinJobCard } from '../cards/pin-job-card'
import { EmptyState } from '../common/empty-state'
import type { PinJob } from '../types'

/** Ответ API для активных заданий */
interface ActiveJobsResponse {
  data: PinJob[]
}

/** Ответ API для завершённых заданий (с пагинацией) */
interface CompletedJobsResponse {
  data: PinJob[]
  hasNextPage: boolean
  total: number
}

/** Размер страницы */
const PAGE_SIZE = 20

/** Интервал polling для активных заданий (мс) */
const ACTIVE_POLLING_INTERVAL = 5_000

/** Загрузить активные задания (PINNING/QUEUED) */
async function fetchActiveJobs(): Promise<ActiveJobsResponse> {
  const res = await fetch('/api/admin/pin-jobs?active=true')
  if (!res.ok) {
    throw new Error('Ошибка загрузки активных заданий')
  }
  return res.json()
}

/** Загрузить завершённые задания с offset-пагинацией */
async function fetchCompletedJobs({ pageParam = 0 }: { pageParam?: number }): Promise<CompletedJobsResponse> {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(pageParam),
  })
  const res = await fetch(`/api/admin/pin-jobs?${params}`)
  if (!res.ok) {
    throw new Error('Ошибка загрузки заданий')
  }
  return res.json()
}

export function PinJobsTab() {
  const [syncing, setSyncing] = useState(false)
  const [deletingFailed, setDeletingFailed] = useState(false)
  const [retryingFailed, setRetryingFailed] = useState(false)
  const [cleaningUp, setCleaningUp] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  // Запрос 1: активные задания с частым polling
  const {
    data: activeData,
    isLoading: activeLoading,
    refetch: refetchActive,
  } = useQuery({
    queryKey: ['admin', 'pin-jobs', 'active'],
    queryFn: fetchActiveJobs,
    refetchInterval: ACTIVE_POLLING_INTERVAL,
  })

  // Запрос 2: завершённые задания с offset infinite scroll
  const {
    data: completedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: completedLoading,
    isError,
    refetch: refetchCompleted,
  } = useInfiniteQuery({
    queryKey: ['admin', 'pin-jobs', 'completed'],
    queryFn: fetchCompletedJobs,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasNextPage) {
        return undefined
      }
      // Следующий offset = сумма загруженных элементов
      return allPages.reduce((sum, page) => sum + page.data.length, 0)
    },
  })

  const activeJobs = activeData?.data ?? []
  const completedJobs = completedData?.pages.flatMap((p) => p.data) ?? []
  const allJobs = [...activeJobs, ...completedJobs]
  const totalCount = activeJobs.length + (completedData?.pages[0]?.total ?? 0)
  const hasFailed = allJobs.some((j) => j.status === 'FAILED')
  const isLoading = activeLoading || completedLoading

  /** Обновить все данные */
  const refetchAll = useCallback(() => {
    refetchActive()
    refetchCompleted()
  }, [refetchActive, refetchCompleted])

  // IntersectionObserver для infinite scroll
  const lastElementRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (isFetchingNextPage) {
        return
      }
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0]?.isIntersecting && hasNextPage) {
          fetchNextPage()
        }
      })
      if (node) {
        observerRef.current.observe(node)
      }
    },
    [isFetchingNextPage, hasNextPage, fetchNextPage],
  )

  // Cleanup observer
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [])

  /** Синхронизировать статусы pin jobs с Kubo */
  const handleSyncStatuses = async () => {
    setSyncing(true)
    try {
      const res = await fetch('/api/admin/pin-jobs/sync', { method: 'POST' })
      if (res.ok) {
        const { data: syncData } = await res.json()
        toaster.success({
          title: `Синхронизировано: ${syncData.synced} заданий, запинено: ${syncData.pinned}`,
        })
        refetchAll()
      } else {
        toaster.error({ title: 'Ошибка синхронизации' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setSyncing(false)
    }
  }

  // Запрос: сколько старых пинов ожидает очистки
  const { data: cleanupStatus, refetch: refetchCleanup } = useQuery({
    queryKey: ['admin', 'cleanup-old-pins', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/admin/cleanup-old-pins')
      if (!res.ok) {
        return null
      }
      return res.json() as Promise<{
        pendingCount: number
        oldestPendingDate: string | null
        recentCleanedCount: number
      }>
    },
    refetchInterval: 60_000, // Раз в минуту
  })

  /** Очистить устаревшие пины (старше 1 дня, безопасно — новый CID уже есть) */
  const handleCleanupOldPins = async () => {
    setCleaningUp(true)
    try {
      const res = await fetch('/api/admin/cleanup-old-pins', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toaster.success({
          title: `Очищено: ${data.cleaned}, пропущено: ${data.skipped}, ошибок: ${data.errors}`,
        })
        refetchAll()
        refetchCleanup()
      } else {
        toaster.error({ title: 'Ошибка очистки' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setCleaningUp(false)
    }
  }

  /** Повторить все FAILED задания */
  const handleRetryAllFailed = async () => {
    setRetryingFailed(true)
    try {
      const res = await fetch('/api/admin/pin-jobs/failed', { method: 'POST' })
      if (res.ok) {
        const { data: retryData } = await res.json()
        toaster.success({
          title: `Повторено: ${retryData.retried}, ошибок: ${retryData.failed}`,
        })
        refetchAll()
      } else {
        const errData = await res.json().catch(() => ({}))
        toaster.error({ title: errData.error || `Ошибка повтора (${res.status})` })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setRetryingFailed(false)
    }
  }

  /** Удалить все FAILED задания */
  const handleDeleteAllFailed = async () => {
    setDeletingFailed(true)
    try {
      const res = await fetch('/api/admin/pin-jobs/failed', { method: 'DELETE' })
      if (res.ok) {
        const { data: deleteData } = await res.json()
        toaster.success({ title: `Удалено ${deleteData.deleted} заданий` })
        refetchAll()
      } else {
        toaster.error({ title: 'Ошибка удаления' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setDeletingFailed(false)
    }
  }

  return (
    <>
      <HStack gap={2} mt={4} mb={4}>
        <Button size="sm" variant="outline" onClick={handleSyncStatuses} loading={syncing}>
          <LuRefreshCw style={{ marginRight: '4px' }} />
          Обновить статусы
        </Button>
        {hasFailed && (
          <>
            <Button
              size="sm"
              variant="outline"
              colorPalette="blue"
              onClick={handleRetryAllFailed}
              loading={retryingFailed}
            >
              <LuRefreshCw style={{ marginRight: '4px' }} />
              Повторить все ошибки
            </Button>
            <Button
              size="sm"
              variant="outline"
              colorPalette="red"
              onClick={handleDeleteAllFailed}
              loading={deletingFailed}
            >
              <LuTrash2 style={{ marginRight: '4px' }} />
              Удалить все ошибки
            </Button>
          </>
        )}
        {(cleanupStatus?.pendingCount ?? 0) > 0 && (
          <Button size="sm" variant="outline" colorPalette="orange" onClick={handleCleanupOldPins} loading={cleaningUp}>
            <LuShieldAlert style={{ marginRight: '4px' }} />
            Очистить старые пины ({cleanupStatus?.pendingCount})
          </Button>
        )}
        <Text fontSize="sm" color="fg.muted" ml="auto">
          {totalCount} заданий
        </Text>
      </HStack>

      <VStack align="stretch" gap={4}>
        {isLoading
          ? (
            <VStack align="stretch" gap={3}>
              {Array.from({ length: 3 }).map((_, i) => (
                <Box key={i} bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px">
                  <HStack mb={2}>
                    <Skeleton h="20px" w="120px" />
                    <Skeleton h="20px" w="80px" ml="auto" />
                  </HStack>
                  <SkeletonText noOfLines={2} gap={2} />
                </Box>
              ))}
            </VStack>
          )
          : isError
          ? (
            <Center py={12}>
              <VStack gap={2}>
                <Text color="red.500">Ошибка загрузки заданий</Text>
                <Button size="sm" onClick={() => refetchAll()}>
                  Повторить
                </Button>
              </VStack>
            </Center>
          )
          : allJobs.length === 0
          ? <EmptyState icon={LuPin} title="Нет заданий" subtitle="Задания появятся после пиннинга контента" />
          : (
            <>
              {allJobs.map((job) => <PinJobCard key={job.id} job={job} onMutate={() => refetchAll()} />)}

              {/* Сентинель для infinite scroll завершённых заданий */}
              {hasNextPage && (
                <Box ref={lastElementRef} py={4}>
                  {isFetchingNextPage && (
                    <Center>
                      <Spinner size="sm" />
                    </Center>
                  )}
                </Box>
              )}
            </>
          )}
      </VStack>
    </>
  )
}
