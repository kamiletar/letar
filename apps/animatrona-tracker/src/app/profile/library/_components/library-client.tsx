'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { resolveImageUrl } from '@/lib/ipfs'
import { Badge, Box, Button, Container, Grid, Heading, HStack, Image, Text, VStack } from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuBookOpen, LuCloud, LuHardDrive, LuStar, LuTrash2 } from 'react-icons/lu'

import { Breadcrumbs } from '@/app/_components/breadcrumbs'

/** Цвета бейджей по статусу просмотра */
const WATCH_STATUS_MAP: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: 'Не начато', color: 'gray' },
  WATCHING: { label: 'Смотрю', color: 'blue' },
  COMPLETED: { label: 'Просмотрено', color: 'green' },
  ON_HOLD: { label: 'Отложено', color: 'yellow' },
  DROPPED: { label: 'Брошено', color: 'red' },
  PLANNED: { label: 'Запланировано', color: 'purple' },
}

interface LibraryItem {
  id: string
  watchStatus: string
  userRating: number | null
  pinnedLocally: boolean
  addedAt: string
  anime: {
    id: string
    title: string
    coverUrl: string | null
    year: number | null
    genres: string[]
    _count: { episodes: number }
  }
  watchProgress: Array<{
    episodeNumber: number
    completed: boolean
  }>
}

interface LibraryClientProps {
  items: LibraryItem[]
}

export function LibraryClient({ items: initialItems }: LibraryClientProps) {
  const router = useRouter()
  const [filter, setFilter] = useState<string>('ALL')

  const filtered = filter === 'ALL' ? initialItems : initialItems.filter((item) => item.watchStatus === filter)

  const handleRemove = async (itemId: string) => {
    try {
      const res = await fetch(`/api/user/library?itemId=${itemId}`, { method: 'DELETE' })
      if (res.ok) {
        toaster.success({ title: 'Удалено из библиотеки' })
        router.refresh()
      } else {
        toaster.error({ title: 'Ошибка удаления' })
      }
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack align="stretch" gap={6}>
        <Breadcrumbs items={[{ label: 'Профиль', href: '/profile' }, { label: 'Библиотека' }]} />

        {/* Заголовок */}
        <HStack justify="space-between">
          <Heading size="xl">
            <LuBookOpen style={{ marginRight: '12px' }} />
            Моя библиотека
          </Heading>
          <Text color="fg.muted">{initialItems.length} аниме</Text>
        </HStack>

        {/* Фильтры по статусу */}
        <HStack gap={2} flexWrap="wrap">
          <Button size="sm" variant={filter === 'ALL' ? 'solid' : 'outline'} onClick={() => setFilter('ALL')}>
            Все ({initialItems.length})
          </Button>
          {Object.entries(WATCH_STATUS_MAP).map(([key, { label, color }]) => {
            const count = initialItems.filter((i) => i.watchStatus === key).length
            if (count === 0) {
              return null
            }
            return (
              <Button
                key={key}
                size="sm"
                variant={filter === key ? 'solid' : 'outline'}
                colorPalette={color}
                onClick={() => setFilter(key)}
              >
                {label} ({count})
              </Button>
            )
          })}
        </HStack>

        {/* Грид аниме */}
        {filtered.length === 0
          ? (
            <Box textAlign="center" py={16}>
              <Text color="fg.muted" fontSize="lg">
                {filter === 'ALL' ? 'Библиотека пуста. Добавьте аниме из каталога!' : 'Нет аниме с таким статусом'}
              </Text>
              <Button asChild mt={4} colorPalette="brand">
                <NextLink href="/anime">Перейти в каталог</NextLink>
              </Button>
            </Box>
          )
          : (
            <Grid
              templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }}
              gap={4}
            >
              {filtered.map((item) => {
                const status = WATCH_STATUS_MAP[item.watchStatus] || WATCH_STATUS_MAP.NOT_STARTED
                const completedEpisodes = item.watchProgress.filter((p) => p.completed).length
                const totalEpisodes = item.anime._count.episodes
                const PinStatusIcon = item.pinnedLocally ? LuHardDrive : LuCloud

                return (
                  <Box
                    key={item.id}
                    borderWidth="1px"
                    borderRadius="xl"
                    overflow="hidden"
                    transitionProperty="box-shadow, transform"
                    transitionDuration="0.2s"
                    _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
                  >
                    {/* Постер */}
                    <Box position="relative" asChild>
                      <NextLink href={`/anime/${item.anime.id}`}>
                        <Image
                          src={resolveImageUrl(item.anime.coverUrl)}
                          alt={item.anime.title}
                          w="100%"
                          aspectRatio="2/3"
                          objectFit="cover"
                        />
                        {/* Бейдж local/remote */}
                        <Badge
                          position="absolute"
                          top={2}
                          right={2}
                          colorPalette={item.pinnedLocally ? 'green' : 'blue'}
                          size="sm"
                        >
                          <PinStatusIcon style={{ marginRight: '4px' }} />
                          {item.pinnedLocally ? 'Локально' : 'Облако'}
                        </Badge>
                      </NextLink>
                    </Box>

                    {/* Информация */}
                    <VStack align="stretch" p={3} gap={2}>
                      <Text fontWeight="semibold" lineClamp={2} fontSize="sm">
                        {item.anime.title}
                      </Text>

                      <HStack justify="space-between">
                        <Badge colorPalette={status.color} size="sm">
                          {status.label}
                        </Badge>
                        {item.userRating !== null && item.userRating !== undefined && (
                          <HStack gap={1}>
                            <LuStar size={12} style={{ color: 'var(--chakra-colors-yellow-400)' }} />
                            <Text fontSize="xs">{item.userRating}</Text>
                          </HStack>
                        )}
                      </HStack>

                      {/* Прогресс */}
                      {totalEpisodes > 0 && (
                        <Text fontSize="xs" color="fg.muted">
                          {completedEpisodes} / {totalEpisodes} эпизодов
                        </Text>
                      )}

                      {/* Кнопка удаления */}
                      <Button size="xs" variant="ghost" colorPalette="red" onClick={() => handleRemove(item.id)}>
                        <LuTrash2 style={{ marginRight: '4px' }} />
                        Удалить
                      </Button>
                    </VStack>
                  </Box>
                )
              })}
            </Grid>
          )}
      </VStack>
    </Container>
  )
}
