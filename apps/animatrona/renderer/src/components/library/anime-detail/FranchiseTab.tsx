'use client'

/**
 * Таб франшизы на странице аниме
 * Отображает интерактивный граф связей франшизы
 */

import { Box, Button, HStack, Icon, Spinner, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuFilm, LuRefreshCw } from 'react-icons/lu'

import { getLibraryShikimoriMap } from '@/app/_actions/anime.action'
import { syncFranchiseFromGraph } from '@/app/_actions/franchise.action'
import { FranchiseGraph } from '@/components/franchise-graph'
import { toaster } from '@/components/ui/toaster'
import type { ShikimoriFranchiseGraph } from '@/types/electron.d'
import { useRouter } from 'next/navigation'

interface FranchiseTabProps {
  /** ID аниме в БД */
  animeId: string
  /** Shikimori ID аниме */
  shikimoriId: number | null
  /** ID франшизы (если есть) */
  franchiseId: string | null
  /** Имя аниме (для названия франшизы) */
  animeName: string
}

export function FranchiseTab({
  animeId: _animeId,
  shikimoriId,
  franchiseId: _franchiseId,
  animeName,
}: FranchiseTabProps) {
  const router = useRouter()
  const [graph, setGraph] = useState<ShikimoriFranchiseGraph | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [noFranchise, setNoFranchise] = useState(false) // Аниме не имеет франшизы
  const [libraryAnimeIds, setLibraryAnimeIds] = useState<Set<number>>(new Set())
  // Маппинг shikimoriId → dbId для навигации без дополнительных запросов
  const [shikimoriToDbId, setShikimoriToDbId] = useState<Map<number, string>>(new Map())

  /**
   * Загрузить граф из БД или из API
   */
  const loadGraph = useCallback(
    async (_forceRefresh = false) => {
      if (!shikimoriId) {
        setError('Нет привязки к Shikimori')
        return
      }

      setIsLoading(true)
      setError(null)
      setNoFranchise(false)

      try {
        // Загружаем граф из Shikimori API (IPFS cat пока не реализован)
        if (!window.electronAPI?.franchise) {
          throw new Error('Electron API недоступен')
        }

        const result = await window.electronAPI.franchise.fetchGraph(shikimoriId)

        // Проверяем успешность запроса
        if (!result.success) {
          throw new Error(result.error || 'Не удалось загрузить граф франшизы')
        }

        // Аниме не имеет франшизы (API вернул success: true, data: null)
        if (!result.data) {
          setGraph(null)
          setNoFranchise(true)
          return
        }

        const apiGraph = result.data.graph

        if (!apiGraph?.nodes?.length) {
          setGraph(null)
          setNoFranchise(true)
          return
        }

        // Сохраняем в БД (graphCid = null — IPFS публикация при генерации манифеста)
        const allNodeIds = apiGraph.nodes.map((n) => n.id)
        const rootShikimoriId = Math.min(...allNodeIds)
        await syncFranchiseFromGraph(null, rootShikimoriId, animeName, allNodeIds)

        setGraph(apiGraph)
        toaster.success({ title: 'Граф франшизы загружен' })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Неизвестная ошибка'
        setError(message)
        toaster.error({ title: 'Ошибка загрузки', description: message })
      } finally {
        setIsLoading(false)
      }
    },
    [shikimoriId, animeName]
  )

  // Загружаем граф и список аниме в библиотеке при монтировании
  useEffect(() => {
    loadGraph()

    // Загружаем маппинг shikimoriId → dbId для выделения на графе и навигации
    getLibraryShikimoriMap().then((items) => {
      setLibraryAnimeIds(new Set(items.map((i) => i.shikimoriId)))
      setShikimoriToDbId(new Map(items.map((i) => [i.shikimoriId, i.id])))
    })
  }, [loadGraph])

  // Нет привязки к Shikimori
  if (!shikimoriId) {
    return (
      <Box p={6} textAlign="center">
        <Text color="fg.muted">Для просмотра графа франшизы необходима привязка к Shikimori</Text>
      </Box>
    )
  }

  // Загрузка
  if (isLoading) {
    return (
      <VStack p={6} gap={4}>
        <Spinner size="lg" color="purple.500" />
        <Text color="fg.muted">Загрузка графа франшизы...</Text>
      </VStack>
    )
  }

  // Ошибка
  if (error) {
    return (
      <VStack p={6} gap={4}>
        <Text color="fg.error">{error}</Text>
        <Button onClick={() => loadGraph(true)} variant="outline">
          <LuRefreshCw />
          Попробовать снова
        </Button>
      </VStack>
    )
  }

  // Аниме не имеет франшизы
  if (noFranchise) {
    return (
      <VStack p={6} gap={4}>
        <Icon as={LuFilm} boxSize={10} color="fg.muted" />
        <Text color="fg.muted" textAlign="center">
          Это аниме не является частью франшизы
        </Text>
        <Text color="fg.subtle" fontSize="sm" textAlign="center">
          Связи с другими аниме не найдены на Shikimori
        </Text>
      </VStack>
    )
  }

  // Нет данных
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <VStack p={6} gap={4}>
        <Text color="fg.muted">Граф франшизы пуст</Text>
        <Button onClick={() => loadGraph(true)} variant="outline">
          <LuRefreshCw />
          Загрузить
        </Button>
      </VStack>
    )
  }

  return (
    <Box>
      {/* Кнопка обновления */}
      <HStack justify="flex-end" mb={2}>
        <Button size="sm" variant="ghost" onClick={() => loadGraph(true)} loading={isLoading}>
          <LuRefreshCw />
          Обновить
        </Button>
      </HStack>

      {/* Граф */}
      <FranchiseGraph
        graph={graph}
        currentAnimeId={shikimoriId}
        libraryAnimeIds={libraryAnimeIds}
        height="calc(100vh - 280px)"
        onNodeClick={(clickedShikimoriId) => {
          // Не переходим на текущее аниме
          if (clickedShikimoriId === shikimoriId) {
            return
          }

          // Ищем аниме в предзагруженном маппинге
          const dbId = shikimoriToDbId.get(clickedShikimoriId)

          if (dbId) {
            // Переходим на страницу аниме
            router.push(`/library/${dbId}`)
          } else {
            // Аниме нет в библиотеке
            toaster.info({
              title: 'Аниме не в библиотеке',
              description: 'Импортируйте это аниме чтобы открыть его страницу',
            })
          }
        }}
      />
    </Box>
  )
}
