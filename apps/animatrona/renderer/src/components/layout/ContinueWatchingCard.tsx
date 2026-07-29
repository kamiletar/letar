'use client'

/**
 * Карточка "Продолжить смотреть" для Sidebar
 * Показывает последний незавершённый эпизод
 * Скрывается на странице /watch (во время просмотра бесмыслен)
 */

import { Box, Flex, HStack, Icon, Text, VStack } from '@chakra-ui/react'
import { formatDistanceToNow } from 'date-fns'
import { ru } from 'date-fns/locale'
import { usePathname, useRouter } from 'next/navigation'
import { memo, useEffect, useState } from 'react'
import { LuPlay } from 'react-icons/lu'

import { findGlobalLastWatched, type GlobalLastWatchedData } from '@/app/_actions/watch-progress.action'

/** Форматирует время в минуты:секунды */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Компонент карточки "Продолжить смотреть"
 * Отображается в Sidebar когда есть незавершённый просмотр
 * Обёрнута в React.memo — компонент без пропсов, живёт в Sidebar рядом с
 * блоками, которые ре-рендерятся раз в 5-30 сек (poll диска/power-save),
 * без memo это тянуло бы за собой весь поддерево карточки на каждый тик.
 */
export const ContinueWatchingCard = memo(function ContinueWatchingCard() {
  const pathname = usePathname()
  const router = useRouter()
  const [data, setData] = useState<GlobalLastWatchedData | null>(null)
  const [loading, setLoading] = useState(true)

  // Скрываем на странице просмотра — во время просмотра карточка бессмысленна
  const isOnWatchPage = pathname?.startsWith('/watch')

  // Загружаем данные при монтировании, смене роута и при возвращении на страницу
  useEffect(() => {
    // Не загружаем на странице просмотра
    if (isOnWatchPage) {
      return
    }

    const load = async () => {
      try {
        const result = await findGlobalLastWatched()
        setData(result)
      } catch (error) {
        console.error('[ContinueWatchingCard] Ошибка загрузки:', error)
      } finally {
        setLoading(false)
      }
    }
    load()

    // Обновляем при фокусе на окно
    const handleFocus = () => {
      load()
    }
    window.addEventListener('focus', handleFocus)

    // Обновляем каждые 30 секунд
    const interval = setInterval(load, 30000)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isOnWatchPage]) // Перезагружаем при смене роута

  // Не показываем на странице просмотра или если нет данных
  if (isOnWatchPage || loading || !data) {
    return null
  }

  // Вычисляем прогресс
  const durationSec = data.durationMs ? data.durationMs / 1000 : 0
  const progressPercent = durationSec > 0 ? Math.min(100, (data.currentTime / durationSec) * 100) : 0

  // Форматируем время
  const timeAgo = formatDistanceToNow(new Date(data.lastWatchedAt), {
    addSuffix: true,
    locale: ru,
  })

  // Определяем URL: discover или библиотека
  const isDiscover = data.episodeId.startsWith('discover-')
  const href = isDiscover
    ? `/discover/${data.animeId}` // Переход к деталям аниме на каталоге
    : `/watch/${data.episodeId}?autoResume=true`

  return (
    <Box
      p={3}
      mx={2}
      mb={4}
      borderRadius="lg"
      bg="bg.muted"
      border="1px"
      borderColor="border"
      _hover={{ bg: 'state.hover', borderColor: 'primary.muted' }}
      transition="all 0.15s ease-out"
      cursor="pointer"
      onClick={() => router.push(href)}
    >
      <VStack gap={2} align="stretch">
        {/* Заголовок */}
        <HStack gap={2}>
          <Icon as={LuPlay} boxSize={4} color="primary.solid" />
          <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
            Продолжить
          </Text>
        </HStack>

        {/* Название аниме */}
        <Text fontSize="sm" fontWeight="medium" color="fg" lineClamp={1} title={data.animeName}>
          {data.animeName}
        </Text>

        {/* Эпизод */}
        <Text fontSize="xs" color="fg.subtle">
          Эпизод {data.episodeNumber}
          {data.episodeName ? ` — ${data.episodeName}` : ''}
        </Text>

        {/* Прогресс бар */}
        <Box>
          <Box h="3px" bg="bg.emphasized" borderRadius="full" overflow="hidden">
            <Box w={`${progressPercent}%`} h="full" bg="primary.solid" transition="width 0.3s ease" />
          </Box>
          <Flex justify="space-between" wrap="wrap" gap={1} mt={1}>
            <Text fontSize="xs" color="fg.subtle">
              {formatTime(data.currentTime)}
              {durationSec > 0 && ` / ${formatTime(durationSec)}`}
            </Text>
            <Text fontSize="xs" color="fg.subtle">
              {timeAgo}
            </Text>
          </Flex>
        </Box>
      </VStack>
    </Box>
  )
})
