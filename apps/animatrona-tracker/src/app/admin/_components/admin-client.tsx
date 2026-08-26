'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Container, Flex, Grid, Heading, HStack, Stat, Tabs, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import { LuArrowLeft, LuFilm, LuHistory, LuPin, LuServer, LuShare2, LuShield } from 'react-icons/lu'

import { ModerationLogTab } from './tabs/moderation-log-tab'
import { ModerationTab } from './tabs/moderation-tab'
import { PinJobsTab } from './tabs/pin-jobs-tab'
import { PinServersTab } from './tabs/pin-servers-tab'
import { SeedsTab } from './tabs/seeds-tab'
import type { AdminClientProps, AnimeItem } from './types'

/** Допустимые значения табов */
const VALID_TABS = ['moderation', 'pinservers', 'pinjobs', 'seeds', 'log'] as const

/** Задержка debounce для накопления кликов в batch (мс) */
const BATCH_DEBOUNCE_MS = 300

/** Элемент очереди batch-модерации */
interface BatchItem {
  id: string
  action: 'approve' | 'reject' | 'approve_replacement'
  pin: boolean
  removedAnime?: AnimeItem
}

export function AdminClient({
  pendingAnime: initialPending,
  stats: initialStats,
  pinServers,
  userRole,
}: AdminClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Локальный state для optimistic updates
  const [pendingAnime, setPendingAnime] = useState<AnimeItem[]>(initialPending)
  const [pendingCount, setPendingCount] = useState(initialStats.pendingAnime)
  const stats = { ...initialStats, pendingAnime: pendingCount }

  // Debounced batch очередь
  const batchQueueRef = useRef<BatchItem[]>([])
  const batchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFlushing = useRef(false)

  // Текущий таб из URL (?tab=pinjobs), fallback на moderation
  const rawTab = searchParams.get('tab')
  const currentTab = VALID_TABS.includes(rawTab as (typeof VALID_TABS)[number]) ? rawTab! : 'moderation'

  /** Обновить URL при переключении таба */
  const handleTabChange = (details: { value: string }) => {
    const params = new URLSearchParams(searchParams.toString())
    if (details.value === 'moderation') {
      params.delete('tab')
    } else {
      params.set('tab', details.value)
    }
    const qs = params.toString()
    router.replace(`/admin${qs ? `?${qs}` : ''}`, { scroll: false })
  }

  const handleRefresh = () => router.refresh()

  /** Optimistic rollback — возвращает карточку при ошибке */
  const optimisticRollback = useCallback((anime: AnimeItem) => {
    setPendingAnime((prev) => {
      if (prev.some((a) => a.id === anime.id)) {
        return prev
      }
      return [...prev, anime].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    })
    setPendingCount((prev) => prev + 1)
  }, [])

  /** Отправить накопленный batch на сервер */
  const flushBatch = useCallback(async () => {
    if (isFlushing.current) {
      return
    }
    const items = batchQueueRef.current.splice(0)
    if (items.length === 0) {
      return
    }

    isFlushing.current = true

    try {
      const res = await fetch('/api/admin/moderate-anime/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(({ id, action, pin }) => ({ id, action, pin })),
        }),
      })

      if (!res.ok) {
        throw new Error('Ошибка сервера')
      }

      const json = await res.json()
      const { results, pinStarted } = json.data as {
        results: Array<{ id: string; success: boolean; error?: string }>
        pinStarted: number
      }

      // Rollback неудачных
      let errorCount = 0
      for (const result of results) {
        if (!result.success) {
          errorCount++
          const original = items.find((i) => i.id === result.id)
          if (original?.removedAnime) {
            optimisticRollback(original.removedAnime)
          }
        }
      }

      // Тосты
      const successCount = results.length - errorCount
      if (successCount > 0) {
        const pinText = pinStarted > 0 ? ` + пиннинг (${pinStarted})` : ''
        toaster.success({
          title: successCount === 1 ? `Аниме обработано${pinText}` : `Обработано: ${successCount} аниме${pinText}`,
        })
      }
      if (errorCount > 0) {
        toaster.error({ title: `Ошибка: ${errorCount} из ${results.length}` })
      }
    } catch {
      // Rollback всех при сетевой ошибке
      for (const item of items) {
        if (item.removedAnime) {
          optimisticRollback(item.removedAnime)
        }
      }
      toaster.error({ title: 'Ошибка batch модерации' })
    } finally {
      isFlushing.current = false
      router.refresh()

      // Если за время flush накопились новые — отправить
      if (batchQueueRef.current.length > 0) {
        flushBatch()
      }
    }
  }, [optimisticRollback, router])

  /** Модерировать аниме (optimistic update + debounced batch) */
  const handleModerateAnime = useCallback(
    (animeId: string, action: 'approve' | 'reject' | 'approve_replacement', pin = false) => {
      // Optimistic: убираем карточку мгновенно
      let removedAnime: AnimeItem | undefined
      setPendingAnime((prev) => {
        removedAnime = prev.find((a) => a.id === animeId)
        return prev.filter((a) => a.id !== animeId)
      })
      setPendingCount((prev) => Math.max(0, prev - 1))

      // Добавляем в batch-очередь
      batchQueueRef.current.push({ id: animeId, action, pin, removedAnime })

      // Сбрасываем debounce таймер (копим клики)
      if (batchTimerRef.current) {
        clearTimeout(batchTimerRef.current)
      }
      batchTimerRef.current = setTimeout(() => {
        batchTimerRef.current = null
        flushBatch()
      }, BATCH_DEBOUNCE_MS)
    },
    [flushBatch],
  )

  return (
    <Box minH="100vh" bg="bg">
      {/* Header */}
      <Box bg="bg.panel" borderBottomWidth="1px" py={4}>
        <Container maxW="container.xl">
          <Flex justify="space-between" align="center">
            <HStack gap={4}>
              <Button asChild variant="ghost" size="sm">
                <NextLink href="/anime">
                  <LuArrowLeft style={{ marginRight: '8px' }} />
                  Каталог
                </NextLink>
              </Button>
              <Heading size="lg">
                <LuShield style={{ marginRight: '8px' }} />
                Админ-панель
              </Heading>
            </HStack>
          </Flex>
        </Container>
      </Box>

      <Container maxW="container.xl" py={8}>
        <VStack align="stretch" gap={8}>
          {/* Статистика */}
          <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={4}>
            <Stat.Root>
              <Stat.Label>На модерации</Stat.Label>
              <Stat.ValueText color="yellow.500">{stats.pendingAnime}</Stat.ValueText>
            </Stat.Root>
            <Stat.Root asChild>
              <NextLink href="/anime" style={{ textDecoration: 'none' }}>
                <Stat.Label>Опубликовано</Stat.Label>
                <Stat.ValueText color="green.500" _hover={{ textDecoration: 'underline' }}>
                  {stats.totalPublished}
                </Stat.ValueText>
              </NextLink>
            </Stat.Root>
            <Stat.Root asChild>
              <NextLink href="/admin/users" style={{ textDecoration: 'none' }}>
                <Stat.Label>Пользователей</Stat.Label>
                <Stat.ValueText _hover={{ textDecoration: 'underline' }}>{stats.totalUsers}</Stat.ValueText>
              </NextLink>
            </Stat.Root>
            <Stat.Root asChild>
              <NextLink href="/admin/pinned" style={{ textDecoration: 'none' }}>
                <Stat.Label>Запинено</Stat.Label>
                <Stat.ValueText color="blue.500" _hover={{ textDecoration: 'underline' }}>
                  {stats.pinnedCount}
                </Stat.ValueText>
              </NextLink>
            </Stat.Root>
          </Grid>

          {/* Табы */}
          <Tabs.Root lazyMount unmountOnExit value={currentTab} onValueChange={handleTabChange}>
            <Tabs.List overflowX="auto" css={{ '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
              <Tabs.Trigger value="moderation" whiteSpace="nowrap">
                <Box hideBelow="md" display="inline">
                  <LuFilm style={{ marginRight: '4px' }} />
                </Box>
                Модерация ({stats.pendingAnime})
              </Tabs.Trigger>
              <Tabs.Trigger value="pinservers" whiteSpace="nowrap">
                <Box hideBelow="md" display="inline">
                  <LuServer style={{ marginRight: '4px' }} />
                </Box>
                Пин-серверы ({pinServers.length})
              </Tabs.Trigger>
              <Tabs.Trigger value="pinjobs" whiteSpace="nowrap">
                <Box hideBelow="md" display="inline">
                  <LuPin style={{ marginRight: '4px' }} />
                </Box>
                Задания
              </Tabs.Trigger>
              <Tabs.Trigger value="seeds" whiteSpace="nowrap">
                <Box hideBelow="md" display="inline">
                  <LuShare2 style={{ marginRight: '4px' }} />
                </Box>
                Раздачи
              </Tabs.Trigger>
              <Tabs.Trigger value="log" whiteSpace="nowrap">
                <Box hideBelow="md" display="inline">
                  <LuHistory style={{ marginRight: '4px' }} />
                </Box>
                Лог
              </Tabs.Trigger>
            </Tabs.List>

            <Tabs.Content value="moderation">
              <ModerationTab
                pendingAnime={pendingAnime}
                pinServers={pinServers}
                userRole={userRole}
                onModerate={handleModerateAnime}
              />
            </Tabs.Content>

            <Tabs.Content value="pinservers">
              <PinServersTab pinServers={pinServers} userRole={userRole} onRefresh={handleRefresh} />
            </Tabs.Content>

            <Tabs.Content value="pinjobs">
              <PinJobsTab />
            </Tabs.Content>

            <Tabs.Content value="seeds">
              <SeedsTab />
            </Tabs.Content>

            <Tabs.Content value="log">
              <ModerationLogTab />
            </Tabs.Content>
          </Tabs.Root>
        </VStack>
      </Container>
    </Box>
  )
}
