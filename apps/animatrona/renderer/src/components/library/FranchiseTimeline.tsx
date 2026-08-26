'use client'

/**
 * FranchiseTimeline — визуальная timeline порядка просмотра франшизы
 *
 * Показывает связанные аниме в хронологическом порядке
 * Отображает статус просмотра для каждого элемента
 */

import { Badge, Box, Heading, HStack, Image, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { LuCheck, LuChevronRight, LuCircle, LuPlay } from 'react-icons/lu'

import type { WatchStatus } from '@/generated/prisma'
import { toMediaUrl } from '@/lib/media-url'
import { computeWatchOrder, getFranchiseRelations, getWatchOrderPosition } from '@/lib/watch-next'
import { useRouter } from 'next/navigation'

/** Данные аниме для timeline */
interface TimelineAnime {
  id: string
  name: string
  year: number | null
  posterPath: string | null
  watchStatus: WatchStatus
  episodeCount: number
  relationLabel: string
  isCurrentAnime: boolean
  position: 'before' | 'current' | 'after'
}

export interface FranchiseTimelineProps {
  /** ID текущего аниме */
  animeId: string
}

/**
 * Компонент timeline франшизы
 * Показывает порядок просмотра связанных аниме
 */
export function FranchiseTimeline({ animeId }: FranchiseTimelineProps) {
  const [items, setItems] = useState<TimelineAnime[]>([])
  const [loading, setLoading] = useState(true)

  // Загружаем связи при монтировании
  useEffect(() => {
    const load = async () => {
      try {
        const relations = await getFranchiseRelations(animeId)

        // Преобразуем в формат для timeline
        const timelineItems: TimelineAnime[] = relations.map((rel) => ({
          id: rel.anime.id,
          name: rel.anime.name,
          year: rel.anime.year,
          posterPath: rel.anime.posterPath,
          watchStatus: rel.anime.watchStatus,
          episodeCount: rel.anime.episodeCount,
          relationLabel: rel.relationLabel,
          isCurrentAnime: rel.isCurrentAnime,
          position: getWatchOrderPosition(rel.relationType, rel.isCurrentAnime),
        }))

        // Сортируем по порядку просмотра
        const sorted = computeWatchOrder(timelineItems)
        setItems(sorted)
      } catch (error) {
        console.error('[FranchiseTimeline] Ошибка загрузки:', error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [animeId])

  // Не показываем если меньше 2 элементов (только текущее аниме)
  if (loading || items.length < 2) {
    return null
  }

  return (
    <Box>
      <Heading size="md" mb={4}>
        Порядок просмотра франшизы
      </Heading>

      {/* Горизонтальная timeline */}
      <Box overflowX="auto" pb={4}>
        <HStack gap={0} minW="fit-content" align="stretch">
          {items.map((item, index) => (
            <HStack key={item.id} gap={0} align="stretch">
              {/* Карточка аниме */}
              <TimelineItem item={item} />

              {/* Соединительная линия */}
              {index < items.length - 1 && (
                <Box display="flex" alignItems="center" px={2}>
                  <Box w="40px" h="2px" bg="border" position="relative">
                    <LuChevronRight
                      style={{
                        position: 'absolute',
                        right: '-6px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                      }}
                      color="var(--chakra-colors-fg-subtle)"
                      size={16}
                    />
                  </Box>
                </Box>
              )}
            </HStack>
          ))}
        </HStack>
      </Box>

      {/* Легенда */}
      <HStack gap={4} mt={2} color="fg.subtle" fontSize="xs">
        <HStack gap={1}>
          <LuCheck color="var(--chakra-colors-green-500)" />
          <Text>Просмотрено</Text>
        </HStack>
        <HStack gap={1}>
          <LuPlay color="var(--chakra-colors-purple-500)" />
          <Text>Смотрите сейчас</Text>
        </HStack>
        <HStack gap={1}>
          <LuCircle color="var(--chakra-colors-fg-subtle)" />
          <Text>Не начато</Text>
        </HStack>
      </HStack>
    </Box>
  )
}

/** Элемент timeline */
function TimelineItem({ item }: { item: TimelineAnime }) {
  const router = useRouter()

  // Определяем иконку и цвет статуса
  const getStatusStyle = () => {
    if (item.watchStatus === 'COMPLETED') {
      return { icon: LuCheck, color: 'green.500', bg: 'green.500/20' }
    }
    if (item.watchStatus === 'WATCHING') {
      return { icon: LuPlay, color: 'purple.500', bg: 'purple.500/20' }
    }
    return { icon: LuCircle, color: 'fg.subtle', bg: 'bg.muted' }
  }

  const status = getStatusStyle()

  return (
    <VStack
      gap={2}
      w="140px"
      p={3}
      borderRadius="lg"
      bg={item.isCurrentAnime ? 'purple.950/30' : 'bg.muted'}
      border="2px"
      borderColor={item.isCurrentAnime ? 'purple.500' : 'transparent'}
      _hover={{ bg: 'state.hover', borderColor: item.isCurrentAnime ? 'purple.400' : 'border' }}
      transition="all 0.15s"
      cursor="pointer"
      position="relative"
      onClick={() => router.push(`/library/${item.id}`)}
    >
      {/* Бейдж текущего */}
      {item.isCurrentAnime && (
        <Badge position="absolute" top={-2} right={-2} colorPalette="purple" size="sm">
          Сейчас
        </Badge>
      )}

      {/* Статус иконка */}
      <Box
        position="absolute"
        top={2}
        left={2}
        w={6}
        h={6}
        borderRadius="full"
        bg={status.bg}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <status.icon color={`var(--chakra-colors-${status.color.replace('.', '-')})`} size={14} />
      </Box>

      {/* Постер */}
      {item.posterPath
        ? (
          <Image
            src={toMediaUrl(item.posterPath) ?? undefined}
            alt={item.name}
            w="100px"
            h="150px"
            objectFit="cover"
            borderRadius="md"
            loading="lazy"
            decoding="async"
          />
        )
        : <Box w="100px" h="150px" bg="whiteAlpha.100" borderRadius="md" />}

      {/* Информация */}
      <VStack gap={0.5} align="center" w="full">
        {/* Год */}
        {item.year && (
          <Text fontSize="xs" color="fg.subtle">
            {item.year}
          </Text>
        )}

        {/* Название */}
        <Text fontSize="xs" fontWeight="medium" color="fg" textAlign="center" lineClamp={2} title={item.name}>
          {item.name}
        </Text>

        {/* Тип связи */}
        {!item.isCurrentAnime && (
          <Text fontSize="xs" color="purple.400">
            {item.relationLabel}
          </Text>
        )}
      </VStack>
    </VStack>
  )
}
