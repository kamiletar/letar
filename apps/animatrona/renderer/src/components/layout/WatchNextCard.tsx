'use client'

/**
 * WatchNextCard — карточка "Что смотреть дальше" для Sidebar
 *
 * Показывает рекомендацию сиквела после завершения аниме
 * Отображается под ContinueWatchingCard
 */

import { Box, HStack, Icon, Image, Text, VStack } from '@chakra-ui/react'
import { memo, useEffect, useState } from 'react'
import { LuArrowRight } from 'react-icons/lu'

import { toMediaUrl } from '@/lib/media-url'
import { getWatchNextSuggestion, type SequelSuggestion } from '@/lib/watch-next'
import { useRouter } from 'next/navigation'

/** Данные для карточки */
interface WatchNextData {
  completedAnime: { id: string; name: string }
  suggestion: SequelSuggestion
}

/**
 * Компонент карточки "Что смотреть дальше"
 * Показывает незначатый сиквел завершённого аниме
 *
 * Обёрнута в React.memo — компонент без пропсов, живёт в Sidebar рядом с
 * блоками, которые ре-рендерятся раз в 5-30 сек (poll диска/power-save),
 * без memo это тянуло бы за собой весь поддерево карточки на каждый тик.
 */
export const WatchNextCard = memo(function WatchNextCard() {
  const router = useRouter()
  const [data, setData] = useState<WatchNextData | null>(null)
  const [loading, setLoading] = useState(true)

  // Загружаем рекомендацию при монтировании
  useEffect(() => {
    const load = async () => {
      try {
        const result = await getWatchNextSuggestion()
        setData(result)
      } catch (error) {
        console.error('[WatchNextCard] Ошибка загрузки:', error)
      } finally {
        setLoading(false)
      }
    }
    load()

    // Обновляем при фокусе на окно (после просмотра)
    const handleFocus = () => {
      load()
    }
    window.addEventListener('focus', handleFocus)

    // Обновляем каждые 60 секунд
    const interval = setInterval(load, 60000)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  // Не показываем если нет данных или загрузка
  if (loading || !data) {
    return null
  }

  const { completedAnime, suggestion } = data

  // Показываем только если есть первый эпизод для просмотра
  if (!suggestion.firstEpisodeId) {
    return null
  }

  return (
    <Box
      p={3}
      mx={2}
      mb={4}
      borderRadius="lg"
      bg="purple.950/30"
      border="1px"
      borderColor="purple.800/50"
      _hover={{ bg: 'purple.900/40', borderColor: 'purple.600/50' }}
      transition="all 0.15s ease-out"
      cursor="pointer"
      onClick={() => router.push(`/watch/${suggestion.firstEpisodeId}`)}
    >
      <VStack gap={2} align="stretch">
        {/* Заголовок */}
        <HStack gap={2}>
          <Icon as={LuArrowRight} boxSize={4} color="purple.400" />
          <Text fontSize="xs" fontWeight="semibold" color="purple.300">
            Смотреть далее
          </Text>
        </HStack>

        {/* Контент */}
        <HStack gap={3}>
          {/* Мини-постер */}
          {suggestion.posterPath
            ? (
              <Image
                src={toMediaUrl(suggestion.posterPath) ?? undefined}
                alt={suggestion.name}
                w="40px"
                h="60px"
                objectFit="cover"
                borderRadius="sm"
                flexShrink={0}
              />
            )
            : <Box w="40px" h="60px" bg="whiteAlpha.200" borderRadius="sm" flexShrink={0} />}

          {/* Информация */}
          <VStack align="start" gap={0.5} flex={1} minW={0}>
            {/* Тип связи */}
            <Text fontSize="xs" color="purple.400" textTransform="uppercase" fontWeight="bold">
              {suggestion.relationLabel}
            </Text>
            {/* Название */}
            <Text fontSize="sm" fontWeight="medium" color="fg" lineClamp={1} title={suggestion.name}>
              {suggestion.name}
            </Text>
            {/* После какого аниме */}
            <Text fontSize="xs" color="fg.subtle" lineClamp={1}>
              После: {completedAnime.name}
            </Text>
          </VStack>
        </HStack>
      </VStack>
    </Box>
  )
})
