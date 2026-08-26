'use client'

import { formatFileSize } from '@/lib/ipfs'
import { Badge, Box, Flex, Grid, HStack, Skeleton, SkeletonText, Text, VStack } from '@chakra-ui/react'
import { useQuery } from '@tanstack/react-query'
import { LuHardDrive, LuMonitor, LuServer, LuShare2 } from 'react-icons/lu'
import { EmptyState } from '../common/empty-state'

/** Тип сида */
interface Seed {
  type: 'desktop' | 'pin-server'
  name: string
  peerId: string | null
  size: number
  lastSeenAt: string
  /** Онлайн-статус из Redis (desktop) или статус сервера (pin-server) */
  online: boolean
  status: string
}

/** Аниме с его сидами */
interface AnimeSeed {
  animeId: string
  title: string
  coverUrl: string | null
  shikimoriId: number | null
  totalSize: number
  /** Количество онлайн сидов */
  onlineCount: number
  seeds: Seed[]
}

/** Загрузка данных */
async function fetchSeeds(): Promise<AnimeSeed[]> {
  const res = await fetch('/api/admin/seeds')
  if (!res.ok) {
    throw new Error('Ошибка загрузки сидов')
  }
  const json = await res.json()
  return json.data
}

/** Время с последнего heartbeat в читаемом формате */
function formatTimeSince(isoDate: string): string {
  const minutes = Math.round((Date.now() - new Date(isoDate).getTime()) / 60000)
  if (minutes < 1) {
    return 'только что'
  }
  if (minutes < 60) {
    return `${minutes} мин. назад`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours} ч. назад`
  }
  const days = Math.round(hours / 24)
  return `${days} дн. назад`
}

/** Карточка сида (строка внутри карточки аниме) */
function SeedRow({ seed }: { seed: Seed }) {
  const isDesktop = seed.type === 'desktop'
  const SeedTypeIcon = isDesktop ? LuMonitor : LuServer

  return (
    <Flex align="center" gap={3} py={1.5} px={2} borderRadius="md" bg={seed.online ? 'bg.subtle' : 'bg.muted'}>
      <SeedTypeIcon color={isDesktop ? 'var(--chakra-colors-purple-500)' : 'var(--chakra-colors-blue-500)'} />
      <Badge size="xs" colorPalette={isDesktop ? 'purple' : 'blue'} variant="subtle">
        {isDesktop ? 'Desktop' : 'Pin-сервер'}
      </Badge>
      <Text fontSize="sm" fontWeight="medium" flex={1} truncate>
        {seed.name}
      </Text>
      {seed.peerId && (
        <Text fontSize="xs" color="fg.muted" display={{ base: 'none', md: 'block' }}>
          {seed.peerId.slice(0, 12)}…
        </Text>
      )}
      <Badge size="xs" colorPalette={seed.online ? 'green' : 'gray'} variant="subtle">
        {seed.online ? 'Online' : 'Offline'}
      </Badge>
      <Text fontSize="xs" color="fg.muted" whiteSpace="nowrap">
        {formatTimeSince(seed.lastSeenAt)}
      </Text>
    </Flex>
  )
}

/** Карточка аниме со всеми его сидами */
function AnimeSeedCard({ animeSeed }: { animeSeed: AnimeSeed }) {
  const desktopCount = animeSeed.seeds.filter((s) => s.type === 'desktop').length
  const serverCount = animeSeed.seeds.filter((s) => s.type === 'pin-server').length

  return (
    <Box bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px">
      {/* Заголовок аниме */}
      <Flex justify="space-between" align="center" mb={3}>
        <HStack gap={3}>
          <Text fontWeight="semibold" fontSize="md">
            {animeSeed.title}
          </Text>
          {animeSeed.shikimoriId && (
            <Badge size="xs" variant="outline">
              #{animeSeed.shikimoriId}
            </Badge>
          )}
        </HStack>
        <HStack gap={2}>
          {animeSeed.totalSize > 0 && (
            <HStack gap={1} color="fg.muted">
              <LuHardDrive size={14} />
              <Text fontSize="xs">{formatFileSize(animeSeed.totalSize)}</Text>
            </HStack>
          )}
          <Badge colorPalette={animeSeed.onlineCount > 0 ? 'green' : 'gray'} size="sm">
            {animeSeed.onlineCount} онлайн / {animeSeed.seeds.length} всего
          </Badge>
        </HStack>
      </Flex>

      {/* Счётчики по типам */}
      <HStack gap={3} mb={2}>
        {desktopCount > 0 && (
          <HStack gap={1}>
            <LuMonitor size={14} color="var(--chakra-colors-purple-500)" />
            <Text fontSize="xs" color="fg.muted">
              {desktopCount} desktop
            </Text>
          </HStack>
        )}
        {serverCount > 0 && (
          <HStack gap={1}>
            <LuServer size={14} color="var(--chakra-colors-blue-500)" />
            <Text fontSize="xs" color="fg.muted">
              {serverCount} {serverCount === 1 ? 'сервер' : 'серверов'}
            </Text>
          </HStack>
        )}
      </HStack>

      {/* Список сидов */}
      <VStack align="stretch" gap={1}>
        {animeSeed.seeds.map((seed, i) => <SeedRow key={`${seed.type}-${seed.name}-${i}`} seed={seed} />)}
      </VStack>
    </Box>
  )
}

/** Вкладка "Раздачи" — объединённый вид desktop сидов и pin-серверов */
export function SeedsTab() {
  const {
    data: seeds,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['admin', 'seeds'],
    queryFn: fetchSeeds,
    refetchInterval: 30_000, // Обновляем каждые 30 сек
  })

  if (isLoading) {
    return (
      <VStack align="stretch" gap={4} py={4}>
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
          {Array.from({ length: 3 }).map((_, i) => (
            <Box key={i} bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px">
              <Skeleton h="16px" w="80px" mb={2} />
              <Skeleton h="28px" w="60px" />
            </Box>
          ))}
        </Grid>
        {Array.from({ length: 3 }).map((_, i) => (
          <Box key={i} bg="bg.panel" p={4} borderRadius="xl" borderWidth="1px">
            <SkeletonText noOfLines={3} gap={3} />
          </Box>
        ))}
      </VStack>
    )
  }

  if (isError) {
    return (
      <Box textAlign="center" py={12}>
        <Text color="fg.error" mb={2}>
          Ошибка загрузки
        </Text>
        <Text fontSize="sm" color="fg.muted" cursor="pointer" onClick={() => refetch()}>
          Попробовать снова
        </Text>
      </Box>
    )
  }

  if (!seeds || seeds.length === 0) {
    return (
      <Box mt={4}>
        <EmptyState
          icon={LuShare2}
          title="Нет активных сидов"
          subtitle="Сиды появятся когда Desktop начнёт раздавать или контент будет запинен на сервере"
        />
      </Box>
    )
  }

  // Общая статистика
  const totalOnline = seeds.reduce((acc, a) => acc + a.onlineCount, 0)
  const totalDesktop = seeds.reduce((acc, a) => acc + a.seeds.filter((s) => s.type === 'desktop').length, 0)
  const totalServers = seeds.reduce((acc, a) => acc + a.seeds.filter((s) => s.type === 'pin-server').length, 0)

  return (
    <VStack align="stretch" gap={4} mt={4}>
      {/* Сводка */}
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={4}>
        <Box bg="bg.panel" p={3} borderRadius="lg" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" color="green.500">
            {seeds.length}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            аниме раздаётся
          </Text>
        </Box>
        <Box bg="bg.panel" p={3} borderRadius="lg" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" color="green.400">
            {totalOnline}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            сидов онлайн
          </Text>
        </Box>
        <Box bg="bg.panel" p={3} borderRadius="lg" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" color="purple.500">
            {totalDesktop}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            desktop сидов
          </Text>
        </Box>
        <Box bg="bg.panel" p={3} borderRadius="lg" textAlign="center">
          <Text fontSize="2xl" fontWeight="bold" color="blue.500">
            {totalServers}
          </Text>
          <Text fontSize="xs" color="fg.muted">
            pin-серверов
          </Text>
        </Box>
      </Grid>

      {/* Список аниме */}
      {seeds.map((animeSeed) => <AnimeSeedCard key={animeSeed.animeId} animeSeed={animeSeed} />)}
    </VStack>
  )
}
