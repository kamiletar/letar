'use client'

/**
 * ContinueWatchingSection — секция "Продолжить просмотр" для главной страницы
 *
 * Загружает последние незавершённые просмотры через /api/watch-progress/continue
 * и показывает карточки с постерами, названиями и прогрессом.
 */

import { Box, Flex, Heading, HStack, Image, LinkBox, LinkOverlay, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { LuPlay } from 'react-icons/lu'

import { resolveImageUrl } from '@/lib/ipfs'

interface ContinueWatchingItem {
  animeId: string
  animeSlug: string
  animeTitle: string
  coverUrl: string | null
  episodeNumber: number
  currentTime: number
  duration: number
  updatedAt: string
}

/** Форматировать время в MM:SS */
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/** Процент просмотра */
function getProgress(currentTime: number, duration: number): number {
  if (duration <= 0) {
    return 0
  }
  return Math.min(Math.round((currentTime / duration) * 100), 100)
}

export function ContinueWatchingSection() {
  const [items, setItems] = useState<ContinueWatchingItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/watch-progress/continue')
      .then((res) => res.json())
      .then((data) => {
        setItems(data.items ?? [])
      })
      .catch(() => {
        // Молча игнорируем ошибки (секция опциональная)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  // Не показываем секцию если нет данных
  if (loading || items.length === 0) {
    return null
  }

  return (
    <Box>
      <Heading as="h2" size="lg" mb={4}>
        Продолжить просмотр
      </Heading>

      <HStack gap={4} overflowX="auto" pb={2}>
        {items.map((item) => (
          <LinkBox
            key={`${item.animeId}-${item.episodeNumber}`}
            flexShrink={0}
            w={{ base: '160px', md: '200px' }}
            borderRadius="lg"
            overflow="hidden"
            bg="bg.muted"
            _hover={{ transform: 'scale(1.02)', shadow: 'lg' }}
            transition="all 0.2s"
          >
            {/* Постер с overlay */}
            <Box position="relative">
              <Image
                src={resolveImageUrl(item.coverUrl)}
                alt={item.animeTitle}
                w="100%"
                h={{ base: '220px', md: '280px' }}
                objectFit="cover"
              />

              {/* Кнопка play */}
              <Flex
                position="absolute"
                inset={0}
                align="center"
                justify="center"
                bg="blackAlpha.400"
                opacity={0}
                _hover={{ opacity: 1 }}
                transition="opacity 0.2s"
              >
                <Box bg="purple.500" borderRadius="full" p={3}>
                  <LuPlay size={24} color="white" />
                </Box>
              </Flex>

              {/* Прогресс-бар */}
              <Box position="absolute" bottom={0} left={0} right={0} h="3px" bg="whiteAlpha.300">
                <Box
                  h="100%"
                  bg="purple.500"
                  w={`${getProgress(item.currentTime, item.duration)}%`}
                  transition="width 0.3s"
                />
              </Box>
            </Box>

            {/* Информация */}
            <VStack align="start" p={2} gap={0.5}>
              <LinkOverlay asChild>
                <Link href={`/watch/${item.animeSlug}/${item.episodeNumber}`}>
                  <Text fontSize="sm" fontWeight="medium" lineClamp={2}>
                    {item.animeTitle}
                  </Text>
                </Link>
              </LinkOverlay>
              <Text fontSize="xs" color="fg.muted">
                Эп. {item.episodeNumber} — {formatTime(item.currentTime)}
              </Text>
            </VStack>
          </LinkBox>
        ))}
      </HStack>
    </Box>
  )
}
