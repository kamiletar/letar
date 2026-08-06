'use client'

/**
 * Страница просмотра библиотеки подписки
 *
 * Загружает библиотеку из IPFS по lastKnownCid без IPNS resolution.
 * Позволяет просматривать аниме из чужой библиотеки и импортировать их.
 */

import { Badge, Box, Button, Grid, Heading, HStack, Icon, Image, Spinner, Text, VStack } from '@chakra-ui/react'
import { use, useCallback, useEffect, useState } from 'react'
import { LuArrowLeft, LuDownload, LuRefreshCw } from 'react-icons/lu'

import { Header } from '@/components/layout'
import { toaster } from '@/components/ui/toaster'
import { toPlayableUrl } from '@/lib/media-url'
import { useRouter } from 'next/navigation'
import type { PublishedAnime, PublishedLibrary, Subscription } from '../../../../../shared/types/ipfs'

interface SubscriptionPageProps {
  params: Promise<{ id: string }>
}

export default function SubscriptionLibraryPage({ params }: SubscriptionPageProps) {
  const { id } = use(params)
  const router = useRouter()

  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [library, setLibrary] = useState<PublishedLibrary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [importingCid, setImportingCid] = useState<string | null>(null)

  /** Загрузить данные подписки и библиотеку */
  const loadData = useCallback(async () => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    setIsLoading(true)
    try {
      // Получить данные подписки
      const subResult = await api.subscriptionGet(id)
      if (!subResult.success || !subResult.data) {
        toaster.error({ title: 'Подписка не найдена' })
        router.push('/settings/p2p-sharing')
        return
      }
      setSubscription(subResult.data)

      // Загрузить библиотеку из IPFS по lastKnownCid
      const libResult = await api.subscriptionFetchLibrary(id)
      if (libResult.success && libResult.data) {
        setLibrary(libResult.data)
      } else {
        setLibrary(null)
      }
    } catch (err) {
      toaster.error({ title: 'Ошибка загрузки', description: String(err) })
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  /** Обновить подписку через IPNS resolution и перезагрузить */
  const handleRefresh = useCallback(async () => {
    const api = window.electronAPI?.ipfs
    if (!api) {
      return
    }

    setIsRefreshing(true)
    try {
      const result = await api.subscriptionRefresh(id)
      if (result.success) {
        toaster.success({ title: 'Подписка обновлена' })
        await loadData()
      } else {
        toaster.error({ title: 'Ошибка обновления', description: result.error })
      }
    } catch (err) {
      toaster.error({ title: 'Ошибка обновления', description: String(err) })
    } finally {
      setIsRefreshing(false)
    }
  }, [id, loadData])

  /** Импортировать аниме из IPFS директории */
  const handleImport = useCallback(async (cid: string) => {
    const api = window.electronAPI?.animeManifest
    if (!api) {
      return
    }

    setImportingCid(cid)
    try {
      const result = await api.import(cid)
      if (result.success && result.data) {
        toaster.success({
          title: 'Аниме импортировано',
          description: result.data.animeName,
        })
        router.push(`/library/${result.data.animeId}`)
      } else {
        toaster.error({ title: 'Ошибка импорта', description: result.error })
      }
    } catch (err) {
      toaster.error({ title: 'Ошибка импорта', description: String(err) })
    } finally {
      setImportingCid(null)
    }
  }, [])

  if (isLoading) {
    return (
      <Box>
        <Header title="Библиотека подписки" />
        <VStack py={12}>
          <Spinner size="xl" color="purple.400" />
          <Text color="fg.subtle">Загрузка библиотеки...</Text>
        </VStack>
      </Box>
    )
  }

  const displayName = subscription?.displayName ?? 'Неизвестный пользователь'

  return (
    <Box>
      <Header title={`Библиотека: ${displayName}`} />

      <Box p={6}>
        {/* Панель навигации и управления */}
        <HStack mb={4} justify="space-between">
          <HStack gap={2}>
            <Button size="sm" variant="ghost" onClick={() => router.push('/settings/p2p-sharing')}>
              <Icon as={LuArrowLeft} />
              Назад
            </Button>
            <Heading size="sm">{displayName}</Heading>
            {library && (
              <Badge colorPalette="purple" size="sm">
                {library.animes.length} аниме
              </Badge>
            )}
          </HStack>
          <Button size="sm" variant="outline" onClick={() => void handleRefresh()} loading={isRefreshing}>
            <Icon as={LuRefreshCw} />
            Обновить
          </Button>
        </HStack>

        {/* Содержимое */}
        {!library
          ? (
            <VStack py={8} gap={4}>
              <Text color="fg.subtle">Нет данных — нажмите «Обновить» для загрузки библиотеки через IPNS</Text>
              <Button colorPalette="purple" onClick={() => void handleRefresh()} loading={isRefreshing}>
                <Icon as={LuRefreshCw} />
                Обновить
              </Button>
            </VStack>
          )
          : (
            <Grid
              templateColumns={{
                base: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                xl: 'repeat(4, 1fr)',
              }}
              gap={4}
            >
              {library.animes.map((anime, idx) => (
                <PublishedAnimeCard
                  key={idx}
                  anime={anime}
                  onImport={handleImport}
                  isImporting={importingCid === anime.directoryCid}
                />
              ))}
            </Grid>
          )}
      </Box>
    </Box>
  )
}

interface PublishedAnimeCardProps {
  anime: PublishedAnime
  onImport: (cid: string) => Promise<void>
  isImporting: boolean
}

function PublishedAnimeCard({ anime, onImport, isImporting }: PublishedAnimeCardProps) {
  // toPlayableUrl использует актуальный baseUrl из setGatewayBaseUrl() в AppShell
  const posterUrl = toPlayableUrl({ cid: anime.posterCid })

  return (
    <Box bg="bg.subtle" borderRadius="lg" overflow="hidden" borderWidth="1px" borderColor="border.subtle">
      {/* Постер */}
      <Box position="relative" aspectRatio="2/3" bg="bg.muted">
        {posterUrl
          ? <Image src={posterUrl} alt={anime.name} w="full" h="full" objectFit="cover" />
          : (
            <VStack justify="center" h="full" color="fg.subtle">
              <Text fontSize="xs">Нет постера</Text>
            </VStack>
          )}
      </Box>

      {/* Информация */}
      <VStack align="start" p={3} gap={1}>
        <Text fontWeight="medium" fontSize="sm" lineClamp={2}>
          {anime.name}
        </Text>
        {anime.originalName && (
          <Text fontSize="xs" color="fg.subtle" lineClamp={1}>
            {anime.originalName}
          </Text>
        )}
        <HStack fontSize="xs" color="fg.muted" gap={2}>
          {anime.year && <Text>{anime.year}</Text>}
          <Text>{anime.episodes.length} эп.</Text>
        </HStack>

        {/* Кнопка импорта */}
        {anime.directoryCid && (
          <Button
            size="xs"
            colorPalette="purple"
            variant="outline"
            w="full"
            mt={1}
            onClick={() => void onImport(anime.directoryCid!)}
            loading={isImporting}
          >
            <Icon as={LuDownload} />
            Импортировать
          </Button>
        )}
      </VStack>
    </Box>
  )
}
