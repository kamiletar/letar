'use client'

import { formatFileSize, formatSeedingTime } from '@/lib/ipfs'
import {
  Badge,
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  HStack,
  Input,
  Stat,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import NextLink from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuBookOpen,
  LuCheck,
  LuChevronLeft,
  LuChevronRight,
  LuClock,
  LuDownload,
  LuFilm,
  LuHardDrive,
  LuKey,
  LuLanguages,
  LuLink,
  LuRefreshCw,
  LuSearch,
  LuSettings,
  LuUpload,
  LuUsers,
} from 'react-icons/lu'

import { AnimeCard, type AnimeCardItem } from '@/app/_components/anime-card'
import { toaster } from '@/app/_components/ui/toaster'
import { signIn } from '@/lib/auth-client'

interface User {
  id: string
  name: string | null
  email: string
  role: string
  customGateway?: string | null
  preferredTrackMode?: string | null
}

interface Stats {
  totalAnime: number
  publishedCount: number
  pendingCount: number
}

/** Статистика раздач пользователя */
interface DistributionStats {
  totalBytesUploaded: number
  totalBytesDownloaded: number
  totalSeedingTimeMs: number
  totalPeersHelped: number
  totalUptimeMs: number
  activeDistributions: number
}

/** Статистика активности пользователя */
interface ActivityStats {
  libraryCount: number
  completedAnimeCount: number
  watchedEpisodesCount: number
}

/** Привязанный аккаунт */
interface LinkedAccount {
  providerId: string
  linkedAt: Date
}

interface ProfileClientProps {
  user: User
  animeList: AnimeCardItem[]
  stats: Stats
  page: number
  totalPages: number
  query: string
  tab: string
  hasStatusMix: boolean
  distributionStats: DistributionStats | null
  activityStats: ActivityStats
  linkedAccounts?: LinkedAccount[]
}

/** Вычислить ratio (отдано / загружено) */
function calcRatio(uploaded: number, downloaded: number): string {
  if (downloaded === 0) {
    return uploaded > 0 ? '∞' : '—'
  }
  return (uploaded / downloaded).toFixed(2)
}

export function ProfileClient({
  user,
  animeList,
  stats,
  page,
  totalPages,
  query: initialQuery,
  tab: initialTab,
  hasStatusMix,
  distributionStats,
  activityStats,
  linkedAccounts = [],
}: ProfileClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(initialQuery)
  const [trackMode, setTrackMode] = useState(user.preferredTrackMode || 'RUSSIAN_DUB')
  const [isSavingTrackMode, setIsSavingTrackMode] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const handleTrackModeChange = useCallback(async (newMode: string) => {
    setTrackMode(newMode)
    setIsSavingTrackMode(true)
    try {
      await fetch('/api/profile/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferredTrackMode: newMode }),
      })
    } finally {
      setIsSavingTrackMode(false)
    }
  }, [])

  // Обновление URL
  const updateParams = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    // Сброс пагинации при смене фильтров (кроме явного page)
    if (!updates.page) {
      params.delete('page')
    }
    router.push(`/profile?${params.toString()}`)
  }

  // Переключение табов
  const handleTabChange = (details: { value: string }) => {
    const params = new URLSearchParams()
    if (details.value !== 'anime') {
      params.set('tab', details.value)
    }
    router.push(`/profile?${params.toString()}`)
  }

  // Debounced поиск
  useEffect(() => {
    if (query === initialQuery) {
      return
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      updateParams({ q: query, tab: initialTab })
    }, 400)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query])

  return (
    <Box minH="100vh" bg="bg">
      <Container maxW="container.xl" py={8}>
        <Flex gap={8} direction={{ base: 'column', lg: 'row' }}>
          {/* Sidebar — только карточка профиля */}
          <Box w={{ base: '100%', lg: '240px' }} flexShrink={0}>
            <Box
              bg="bg.panel"
              p={6}
              borderRadius="xl"
              borderWidth="1px"
              position={{ lg: 'sticky' }}
              top={{ lg: '100px' }}
            >
              <VStack gap={4}>
                {/* Аватар */}
                <Box
                  w={16}
                  h={16}
                  borderRadius="full"
                  bg="brand.500"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  color="white"
                  fontSize="2xl"
                  fontWeight="bold"
                >
                  {user.name?.[0] || user.email[0].toUpperCase()}
                </Box>

                <VStack gap={1}>
                  <Text fontWeight="semibold" fontSize="lg">
                    {user.name || 'Пользователь'}
                  </Text>
                  <Text color="fg.muted" fontSize="sm">
                    {user.email}
                  </Text>
                  <Badge colorPalette="brand">{user.role}</Badge>
                </VStack>

                {/* Краткая статистика */}
                <Grid templateColumns="repeat(2, 1fr)" gap={3} w="100%">
                  <Stat.Root>
                    <Stat.Label fontSize="xs">Аниме</Stat.Label>
                    <Stat.ValueText fontSize="xl">{stats.totalAnime}</Stat.ValueText>
                  </Stat.Root>
                  <Stat.Root>
                    <Stat.Label fontSize="xs">Опубликовано</Stat.Label>
                    <Stat.ValueText fontSize="xl">{stats.publishedCount}</Stat.ValueText>
                  </Stat.Root>
                </Grid>
              </VStack>
            </Box>
          </Box>

          {/* Основной контент с табами */}
          <Box flex={1}>
            <Tabs.Root lazyMount unmountOnExit value={initialTab} onValueChange={handleTabChange}>
              <Tabs.List
                mb={6}
                overflowX="auto"
                css={{ '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}
              >
                <Tabs.Trigger value="anime" whiteSpace="nowrap">
                  <LuFilm style={{ marginRight: '4px' }} />
                  Мои аниме ({stats.totalAnime})
                </Tabs.Trigger>
                <Tabs.Trigger value="stats" whiteSpace="nowrap">
                  <LuHardDrive style={{ marginRight: '4px' }} />
                  Статистика
                </Tabs.Trigger>
                <Tabs.Trigger value="settings" whiteSpace="nowrap">
                  <LuSettings style={{ marginRight: '4px' }} />
                  Настройки
                </Tabs.Trigger>
              </Tabs.List>

              {/* Таб: Мои аниме */}
              <Tabs.Content value="anime">
                <VStack align="stretch" gap={4}>
                  {/* Поиск */}
                  <Flex gap={2} align="center" maxW="400px">
                    <LuSearch style={{ color: 'var(--chakra-colors-fg-muted)' }} />
                    <Input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Поиск по моим аниме..."
                      size="sm"
                    />
                  </Flex>

                  {/* Статусы (если есть микс) */}
                  {hasStatusMix && stats.pendingCount > 0 && (
                    <HStack gap={2}>
                      <Badge colorPalette="green">Опубликовано: {stats.publishedCount}</Badge>
                      <Badge colorPalette="yellow">На модерации: {stats.pendingCount}</Badge>
                    </HStack>
                  )}

                  {animeList.length === 0
                    ? (
                      <Box textAlign="center" py={16} bg="bg.panel" borderRadius="xl">
                        <LuFilm
                          size={48}
                          style={{ color: 'var(--chakra-colors-fg-muted)', marginBottom: '16px' }}
                        />
                        <Heading size="lg" mb={2}>
                          {initialQuery ? 'Ничего не найдено' : 'У вас пока нет аниме на трекере'}
                        </Heading>
                        <Text color="fg.muted">
                          {initialQuery ? 'Попробуйте изменить поиск' : 'Опубликуйте аниме через Animatrona Desktop'}
                        </Text>
                      </Box>
                    )
                    : (
                      <>
                        <Grid
                          templateColumns={{
                            base: '1fr',
                            sm: 'repeat(2, 1fr)',
                            md: 'repeat(3, 1fr)',
                            xl: 'repeat(4, 1fr)',
                          }}
                          gap={6}
                        >
                          {animeList.map((anime) => (
                            <Box key={anime.id} position="relative">
                              <AnimeCard anime={anime} />
                              {/* Бейдж статуса для PENDING */}
                              {(anime as AnimeCardItem & { status?: string }).status === 'PENDING' && (
                                <Badge position="absolute" top={2} left={2} colorPalette="yellow" zIndex={1}>
                                  На модерации
                                </Badge>
                              )}
                            </Box>
                          ))}
                        </Grid>

                        {/* Пагинация */}
                        {totalPages > 1 && (
                          <Flex justify="center" gap={2} mt={4}>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={page <= 1}
                              onClick={() => updateParams({ page: String(page - 1), tab: initialTab })}
                            >
                              <LuChevronLeft />
                            </Button>
                            <HStack gap={1}>
                              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum: number
                                if (totalPages <= 5) {
                                  pageNum = i + 1
                                } else if (page <= 3) {
                                  pageNum = i + 1
                                } else if (page >= totalPages - 2) {
                                  pageNum = totalPages - 4 + i
                                } else {
                                  pageNum = page - 2 + i
                                }
                                return (
                                  <Button
                                    key={pageNum}
                                    size="sm"
                                    variant={page === pageNum ? 'solid' : 'outline'}
                                    colorPalette={page === pageNum ? 'brand' : 'gray'}
                                    onClick={() => updateParams({ page: String(pageNum), tab: initialTab })}
                                  >
                                    {pageNum}
                                  </Button>
                                )
                              })}
                            </HStack>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={page >= totalPages}
                              onClick={() => updateParams({ page: String(page + 1), tab: initialTab })}
                            >
                              <LuChevronRight />
                            </Button>
                          </Flex>
                        )}
                      </>
                    )}
                </VStack>
              </Tabs.Content>

              {/* Таб: Статистика */}
              <Tabs.Content value="stats">
                <VStack align="stretch" gap={6}>
                  {/* Раздачи */}
                  {distributionStats && (
                    <Box bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px">
                      <HStack mb={4}>
                        <LuHardDrive />
                        <Heading size="sm">Раздачи</Heading>
                      </HStack>
                      <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }} gap={4}>
                        <Stat.Root>
                          <Stat.Label>
                            <HStack gap={1}>
                              <LuUpload size={12} />
                              <Text>Отдано</Text>
                            </HStack>
                          </Stat.Label>
                          <Stat.ValueText>{formatFileSize(distributionStats.totalBytesUploaded)}</Stat.ValueText>
                        </Stat.Root>
                        <Stat.Root>
                          <Stat.Label>
                            <HStack gap={1}>
                              <LuDownload size={12} />
                              <Text>Загружено</Text>
                            </HStack>
                          </Stat.Label>
                          <Stat.ValueText>{formatFileSize(distributionStats.totalBytesDownloaded)}</Stat.ValueText>
                        </Stat.Root>
                        <Stat.Root>
                          <Stat.Label>Ratio</Stat.Label>
                          <Stat.ValueText>
                            {calcRatio(distributionStats.totalBytesUploaded, distributionStats.totalBytesDownloaded)}
                          </Stat.ValueText>
                        </Stat.Root>
                        <Stat.Root>
                          <Stat.Label>
                            <HStack gap={1}>
                              <LuClock size={12} />
                              <Text>Время раздачи</Text>
                            </HStack>
                          </Stat.Label>
                          <Stat.ValueText>{formatSeedingTime(distributionStats.totalSeedingTimeMs)}</Stat.ValueText>
                        </Stat.Root>
                        <Stat.Root>
                          <Stat.Label>
                            <HStack gap={1}>
                              <LuClock size={12} />
                              <Text>Аптайм</Text>
                            </HStack>
                          </Stat.Label>
                          <Stat.ValueText>{formatSeedingTime(distributionStats.totalUptimeMs)}</Stat.ValueText>
                        </Stat.Root>
                        <Stat.Root>
                          <Stat.Label>
                            <HStack gap={1}>
                              <LuUsers size={12} />
                              <Text>Помог пирам</Text>
                            </HStack>
                          </Stat.Label>
                          <Stat.ValueText>{distributionStats.totalPeersHelped}</Stat.ValueText>
                        </Stat.Root>
                      </Grid>
                    </Box>
                  )}

                  {/* Активность */}
                  <Box bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px">
                    <HStack mb={4}>
                      <LuBookOpen />
                      <Heading size="sm">Активность</Heading>
                    </HStack>
                    <Grid templateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }} gap={4}>
                      <Stat.Root>
                        <Stat.Label>В библиотеке</Stat.Label>
                        <Stat.ValueText>{activityStats.libraryCount}</Stat.ValueText>
                      </Stat.Root>
                      <Stat.Root>
                        <Stat.Label>Просмотрено аниме</Stat.Label>
                        <Stat.ValueText>{activityStats.completedAnimeCount}</Stat.ValueText>
                      </Stat.Root>
                      <Stat.Root>
                        <Stat.Label>Просмотрено эпизодов</Stat.Label>
                        <Stat.ValueText>{activityStats.watchedEpisodesCount}</Stat.ValueText>
                      </Stat.Root>
                    </Grid>
                  </Box>

                  {/* Библиотека — ссылка */}
                  <Button asChild variant="outline" size="lg" w="fit-content">
                    <NextLink href="/profile/library">
                      <LuBookOpen style={{ marginRight: '8px' }} />
                      Открыть библиотеку
                    </NextLink>
                  </Button>
                </VStack>
              </Tabs.Content>

              {/* Таб: Настройки */}
              <Tabs.Content value="settings">
                <VStack align="stretch" gap={6}>
                  {/* Настройки плеера */}
                  <Box bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px">
                    <HStack mb={4}>
                      <LuLanguages />
                      <Heading size="sm">Настройки плеера</Heading>
                    </HStack>
                    <Text fontSize="sm" color="fg.muted" mb={3}>
                      Предпочитаемый режим дорожек для новых просмотров
                    </Text>
                    <HStack gap={2}>
                      <Button
                        size="sm"
                        variant={trackMode === 'RUSSIAN_DUB' ? 'solid' : 'outline'}
                        colorPalette={trackMode === 'RUSSIAN_DUB' ? 'brand' : undefined}
                        onClick={() => handleTrackModeChange('RUSSIAN_DUB')}
                        disabled={isSavingTrackMode}
                      >
                        Озвучка
                      </Button>
                      <Button
                        size="sm"
                        variant={trackMode === 'ORIGINAL_SUB' ? 'solid' : 'outline'}
                        colorPalette={trackMode === 'ORIGINAL_SUB' ? 'brand' : undefined}
                        onClick={() => handleTrackModeChange('ORIGINAL_SUB')}
                        disabled={isSavingTrackMode}
                      >
                        Оригинал + субтитры
                      </Button>
                    </HStack>
                  </Box>

                  {/* Привязанные аккаунты */}
                  <LinkedAccountsSection linkedAccounts={linkedAccounts} />

                  {/* API Ключи */}
                  <Box bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px">
                    <HStack mb={4}>
                      <LuKey />
                      <Heading size="sm">API Ключи</Heading>
                    </HStack>
                    <Text fontSize="sm" color="fg.muted" mb={4}>
                      Публикуйте аниме напрямую из Animatrona
                    </Text>
                    <Button asChild size="sm" variant="outline">
                      <NextLink href="/profile/api-keys">
                        <LuKey style={{ marginRight: '8px' }} />
                        Управление ключами
                      </NextLink>
                    </Button>
                  </Box>
                </VStack>
              </Tabs.Content>
            </Tabs.Root>
          </Box>
        </Flex>
      </Container>
    </Box>
  )
}

/** Секция привязанных аккаунтов */
function LinkedAccountsSection({ linkedAccounts }: { linkedAccounts: LinkedAccount[] }) {
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<{ imported: number; notFound: number } | null>(null)

  const hasShikimori = linkedAccounts.some((a) => a.providerId === 'shikimori')

  const handleLinkShikimori = async () => {
    try {
      await signIn.oauth2({ providerId: 'shikimori' })
    } catch {
      toaster.error({ title: 'Ошибка привязки Shikimori' })
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await fetch('/api/user/sync/shikimori', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toaster.error({ title: 'Ошибка синхронизации', description: data.error })
        return
      }
      setSyncResult({ imported: data.imported, notFound: data.notFound })
      toaster.success({
        title: 'Синхронизация завершена',
        description: `Импортировано: ${data.imported}, не найдено: ${data.notFound}`,
      })
    } catch {
      toaster.error({ title: 'Ошибка сети' })
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Box bg="bg.panel" p={6} borderRadius="xl" borderWidth="1px">
      <HStack mb={4}>
        <LuLink />
        <Heading size="sm">Привязанные аккаунты</Heading>
      </HStack>

      <Box>
        <HStack justify="space-between" mb={2}>
          <HStack gap={2}>
            <LuBookOpen style={{ color: 'var(--chakra-colors-green-500)' }} />
            <Text fontWeight="medium">Shikimori</Text>
          </HStack>
          {hasShikimori
            ? (
              <Badge colorPalette="green" display="flex" alignItems="center" gap={1}>
                <LuCheck size={12} />
                Привязан
              </Badge>
            )
            : <Badge colorPalette="gray">Не привязан</Badge>}
        </HStack>

        {hasShikimori
          ? (
            <VStack align="stretch" gap={2}>
              <Button size="sm" variant="outline" onClick={handleSync} loading={syncing}>
                <LuRefreshCw style={{ marginRight: '8px' }} />
                Синхронизировать список
              </Button>
              {syncResult && (
                <Text fontSize="xs" color="fg.muted">
                  Импортировано: {syncResult.imported}, не найдено на трекере: {syncResult.notFound}
                </Text>
              )}
            </VStack>
          )
          : (
            <Button size="sm" variant="outline" onClick={handleLinkShikimori}>
              <LuLink style={{ marginRight: '8px' }} />
              Привязать Shikimori
            </Button>
          )}
      </Box>
    </Box>
  )
}
