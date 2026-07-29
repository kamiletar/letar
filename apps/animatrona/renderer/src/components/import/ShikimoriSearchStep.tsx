'use client'

/**
 * Шаг 2: Поиск аниме в Shikimori
 */

import { Box, Button, HStack, Icon, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuSearch, LuX } from 'react-icons/lu'

import { checkExistingAnimeByShikimoriIds, type ExistingAnimeInfo } from '@/app/_actions/anime.action'
import { useAnimeDetails, useSearchAnime } from '@/lib/shikimori/hooks'
import type { ShikimoriAnimePreview } from '@/types/electron'

import { ShikimoriAnimeCard } from './ShikimoriAnimeCard'

interface ShikimoriSearchStepProps {
  initialQuery: string
  selectedAnime: ShikimoriAnimePreview | null
  onAnimeSelect: (anime: ShikimoriAnimePreview | null) => void
  /** Предустановленный shikimoriId для автоматического выбора */
  preselectedShikimoriId?: number
  /** Номер сезона из parsedInfo (для ранжирования результатов) */
  seasonNumber?: number
}

/**
 * Шаг поиска аниме в базе Shikimori
 */
/**
 * Вычисляет релевантность результата поиска по номеру сезона
 * Проверяет название (ТВ-N, Season N, Nth Season) и порядок в франшизе
 */
function seasonRelevance(anime: ShikimoriAnimePreview, seasonNumber: number): number {
  let score = 0
  const title = `${anime.name} ${anime.russian ?? ''}`

  // Проверяем наличие номера сезона в названии
  const seasonPatterns = [
    new RegExp(`\\b${seasonNumber}(?:st|nd|rd|th)\\s*season`, 'i'),
    new RegExp(`season\\s*${seasonNumber}\\b`, 'i'),
    new RegExp(`(?:ТВ|TV)[\\s-]${seasonNumber}\\b`, 'i'),
    new RegExp(`\\b${seasonNumber}\\b`), // Просто число в названии
  ]

  // Точное совпадение сезона в названии — максимальный бонус
  if (seasonPatterns[0].test(title) || seasonPatterns[1].test(title) || seasonPatterns[2].test(title)) {
    score += 100
  } else if (seasonPatterns[3].test(title)) {
    score += 30 // Просто число — слабее
  }

  // Если сезон 1 и в названии НЕТ номера сезона — скорее всего это первый сезон
  if (seasonNumber === 1 && !/\b(?:2nd|3rd|4th|5th|season\s*[2-9]|ТВ[- ][2-9]|TV[- ][2-9])/i.test(title)) {
    score += 50
  }

  return score
}

export function ShikimoriSearchStep({
  initialQuery,
  selectedAnime,
  onAnimeSelect,
  preselectedShikimoriId,
  seasonNumber,
}: ShikimoriSearchStepProps) {
  const [query, setQuery] = useState(initialQuery)
  const { isLoading, data, error, search, reset } = useSearchAnime()
  const { fetchDetails, isLoading: isLoadingDetails } = useAnimeDetails()
  // Кэш существующих аниме в библиотеке: shikimoriId -> info
  const [existingAnimeMap, setExistingAnimeMap] = useState<Map<number, ExistingAnimeInfo>>(new Map())

  /** Выполнить поиск */
  const handleSearch = useCallback(() => {
    if (query.trim().length >= 2) {
      search({ search: query.trim(), limit: 10 })
    }
  }, [query, search])

  /** Автоматическая загрузка по preselectedShikimoriId */
  useEffect(() => {
    if (preselectedShikimoriId && !selectedAnime) {
      fetchDetails(preselectedShikimoriId).then((details) => {
        if (details) {
          onAnimeSelect(details)
        }
      })
    }
  }, [preselectedShikimoriId, selectedAnime, fetchDetails, onAnimeSelect])

  /** Автоматический поиск при монтировании (только если нет preselected) */
  useEffect(() => {
    if (!preselectedShikimoriId && initialQuery.trim().length >= 2 && !data && !isLoading) {
      search({ search: initialQuery.trim(), limit: 10 })
    }
  }, [preselectedShikimoriId, initialQuery, data, isLoading, search])

  /** Проверяем какие аниме из результатов уже есть в библиотеке */
  useEffect(() => {
    if (!data || data.length === 0) {
      return
    }

    const shikimoriIds = data.map((anime) => Number(anime.id))
    checkExistingAnimeByShikimoriIds(shikimoriIds)
      .then((result) => {
        // Конвертируем Record в Map
        const map = new Map<number, ExistingAnimeInfo>()
        for (const [shikimoriIdStr, info] of Object.entries(result)) {
          map.set(parseInt(shikimoriIdStr, 10), info)
        }
        setExistingAnimeMap(map)
      })
      .catch((err) => {
        console.error('[ShikimoriSearchStep] Ошибка проверки библиотеки:', err)
      })
  }, [data])

  /** Результаты, отсортированные по релевантности (если есть seasonNumber) */
  const sortedResults = useMemo(() => {
    if (!data || !seasonNumber || seasonNumber <= 1) {
      return data
    }
    return [...data].sort((a, b) => seasonRelevance(b, seasonNumber) - seasonRelevance(a, seasonNumber))
  }, [data, seasonNumber])

  /** Очистить поиск */
  const handleClear = useCallback(() => {
    setQuery('')
    reset()
    onAnimeSelect(null)
  }, [reset, onAnimeSelect])

  /** Обработка Enter */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSearch()
      }
    },
    [handleSearch]
  )

  return (
    <VStack gap={4} align="stretch" py={4}>
      {/* Поле поиска */}
      <HStack gap={2}>
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Введите название аниме..."
          bg="bg.subtle"
          borderColor="border.subtle"
          _hover={{ borderColor: 'border.subtle' }}
          _focus={{ borderColor: 'purple.500' }}
        />
        {query && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <Icon as={LuX} />
          </Button>
        )}
        <Button colorPalette="purple" onClick={handleSearch} disabled={query.trim().length < 2 || isLoading}>
          {isLoading ? <Spinner size="sm" /> : <Icon as={LuSearch} />}
        </Button>
      </HStack>

      {/* Ошибка */}
      {error && (
        <Box p={3} bg="red.900/30" borderRadius="md" borderWidth="1px" borderColor="red.800">
          <Text color="red.400" fontSize="sm">
            {error}
          </Text>
        </Box>
      )}

      {/* Результаты поиска */}
      {sortedResults && sortedResults.length > 0 && (
        <Box maxH="400px" overflowY="auto">
          <VStack gap={2} align="stretch">
            {sortedResults.map((anime) => {
              const existingInfo = existingAnimeMap.get(Number(anime.id))
              return (
                <ShikimoriAnimeCard
                  key={anime.id}
                  anime={anime}
                  isSelected={selectedAnime?.id === anime.id}
                  onClick={() => onAnimeSelect(selectedAnime?.id === anime.id ? null : anime)}
                  isInLibrary={!!existingInfo}
                  libraryEpisodeCount={existingInfo?.episodeCount}
                />
              )
            })}
          </VStack>
        </Box>
      )}

      {/* Пустой результат */}
      {data && data.length === 0 && (
        <Box textAlign="center" py={8}>
          <Text color="fg.subtle">Ничего не найдено по запросу «{query}»</Text>
          <Text fontSize="sm" color="fg.subtle" mt={2}>
            Попробуйте изменить запрос или ввести название на японском/английском
          </Text>
        </Box>
      )}

      {/* Загрузка предустановленного аниме */}
      {isLoadingDetails && (
        <Box textAlign="center" py={8}>
          <Spinner size="lg" color="purple.500" mb={3} />
          <Text color="fg.subtle">Загрузка информации об аниме...</Text>
        </Box>
      )}

      {/* Начальное состояние */}
      {!data && !isLoading && !isLoadingDetails && !error && !selectedAnime && (
        <Box textAlign="center" py={8}>
          <Icon as={LuSearch} boxSize={10} color="fg.subtle" mb={3} />
          <Text color="fg.subtle">Введите название аниме для поиска в базе Shikimori</Text>
        </Box>
      )}

      {/* Выбранное аниме */}
      {selectedAnime && (
        <Box mt={4} p={3} bg="purple.900/30" borderRadius="md" borderWidth="1px" borderColor="purple.700">
          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <Text fontSize="xs" color="purple.400">
                Выбрано для импорта:
              </Text>
              <Text fontWeight="medium">{selectedAnime.russian ?? selectedAnime.name}</Text>
            </VStack>
            <Button size="xs" variant="ghost" colorPalette="purple" onClick={() => onAnimeSelect(null)}>
              Изменить
            </Button>
          </HStack>
        </Box>
      )}

      {/* Предупреждение: аниме уже в библиотеке */}
    </VStack>
  )
}
