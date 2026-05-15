/**
 * Карточка "Продолжить просмотр" — отображает последний просмотренный эпизод
 */

import { Box, Flex, Image, Text, VStack } from '@chakra-ui/react'
import { LuPlay } from 'react-icons/lu'
import { Link } from 'react-router-dom'

import { getPosterUrl, type LastWatched } from '../api'

interface ContinueWatchingCardProps {
  data: LastWatched
}

export function ContinueWatchingCard({ data }: ContinueWatchingCardProps) {
  const { anime, episode, progress } = data

  // Прогресс в процентах
  const progressPercent = episode.durationMs
    ? Math.round((progress.currentTime / (episode.durationMs / 1000)) * 100)
    : 0

  // Форматирование оставшегося времени
  const remainingSeconds = episode.durationMs ? Math.max(0, episode.durationMs / 1000 - progress.currentTime) : 0
  const remainingMinutes = Math.ceil(remainingSeconds / 60)

  // Вызвать fullscreen при клике — в том же user gesture перед навигацией
  const handleClick = () => {
    document.documentElement.requestFullscreen?.().catch(() => {
      // Игнорируем ошибки — fullscreen может быть недоступен
    })
  }

  return (
    <Link to={`/player/${episode.id}?anime=${anime.id}`} onClick={handleClick}>
      <Box
        position="relative"
        bg="gray.900"
        borderRadius="xl"
        overflow="hidden"
        transition="all 0.2s"
        _hover={{ transform: 'scale(1.01)' }}
        _active={{ transform: 'scale(0.99)' }}
      >
        <Flex>
          {/* Постер */}
          <Box flexShrink={0} w="100px" position="relative">
            <Image src={getPosterUrl(anime.id)} alt={anime.name} w="100%" h="100%" objectFit="cover" />
            {/* Overlay градиент */}
            <Box position="absolute" inset={0} bgGradient="to-r" gradientFrom="transparent" gradientTo="gray.900" />
          </Box>

          {/* Контент */}
          <VStack align="start" flex={1} p={4} gap={2}>
            <Text color="purple.400" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
              Продолжить просмотр
            </Text>

            <Text fontWeight="semibold" fontSize="sm" lineClamp={1}>
              {anime.name}
            </Text>

            <Text color="gray.400" fontSize="xs">
              Эпизод {episode.number}
              {episode.name && `: ${episode.name}`}
            </Text>

            {/* Прогресс */}
            <Box w="100%">
              <Flex justify="space-between" mb={1}>
                <Text color="gray.500" fontSize="xs">
                  {formatTime(progress.currentTime)} / {formatTime(episode.durationMs ? episode.durationMs / 1000 : 0)}
                </Text>
                <Text color="gray.500" fontSize="xs">
                  {remainingMinutes} мин осталось
                </Text>
              </Flex>
              <Box h="3px" bg="gray.700" borderRadius="full">
                <Box h="100%" bg="purple.500" borderRadius="full" w={`${progressPercent}%`} />
              </Box>
            </Box>
          </VStack>

          {/* Кнопка воспроизведения */}
          <Flex alignItems="center" justifyContent="center" px={4}>
            <Box
              w="48px"
              h="48px"
              borderRadius="full"
              bg="purple.600"
              display="flex"
              alignItems="center"
              justifyContent="center"
              transition="all 0.2s"
              _hover={{ bg: 'purple.500', transform: 'scale(1.1)' }}
            >
              <LuPlay size={24} color="white" fill="white" />
            </Box>
          </Flex>
        </Flex>
      </Box>
    </Link>
  )
}

/** Форматирование времени в mm:ss */
function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}
