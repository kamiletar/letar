'use client'

import {
  Badge,
  Box,
  Button,
  Container,
  Grid,
  Heading,
  HStack,
  Image,
  Input,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { LuCloud, LuDownload, LuGlobe, LuLibrary, LuPlus, LuSearch } from 'react-icons/lu'
import type { TrackerCatalogAnime } from '../../../../shared/types/tracker'
import { useFindManyAnime } from '../../lib/hooks'
import { useCoverUrl } from '../../lib/hooks/use-cover-url'

/** Страница каталога аниме с трекера (Discover) */
export default function DiscoverPage() {
  const router = useRouter()
  const [animeList, setAnimeList] = useState<TrackerCatalogAnime[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [importingId, setImportingId] = useState<string | null>(null)
  const getCoverUrl = useCoverUrl()

  // Загружаем локальные аниме для проверки «уже в библиотеке»
  const { data: localAnimeList } = useFindManyAnime({
    select: { id: true, directoryCid: true, shikimoriId: true },
  })

  const localAnimeMap = useMemo(() => {
    const map = new Map<string, string>()
    if (localAnimeList) {
      for (const a of localAnimeList) {
        if (a.directoryCid) {
          map.set(`dir:${a.directoryCid}`, a.id)
        }
        if (a.shikimoriId) {
          map.set(`shiki:${a.shikimoriId}`, a.id)
        }
      }
    }
    return map
  }, [localAnimeList])

  const limit = 20

  const loadCatalog = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // createHandler оборачивает: { success, data?: TrackerCatalogResult, error? }
      const ipcResult = (await window.electronAPI!.tracker.getCatalog({ page, limit, q: search || undefined })) as any
      if (!ipcResult?.success) {
        setError(ipcResult?.error || 'Ошибка загрузки каталога')
        return
      }
      // Разворачиваем внутренний TrackerCatalogResult
      const result = ipcResult.data
      if (result?.success && Array.isArray(result.data)) {
        setAnimeList(result.data)
        setTotal(result.total ?? 0)
      } else {
        setError(result?.error || 'Пустой ответ от трекера')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Неизвестная ошибка')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    loadCatalog()
  }, [loadCatalog])

  /** Добавить аниме в библиотеку на трекере */
  const handleAddToLibrary = async (animeId: string) => {
    setAddingId(animeId)
    try {
      await window.electronAPI!.tracker.addToLibrary(animeId)
    } finally {
      setAddingId(null)
    }
  }

  /** Импортировать аниме по directoryCid */
  const handleImport = async (anime: TrackerCatalogAnime, pin: boolean) => {
    if (!anime.directoryCid) {
      return
    }
    setImportingId(anime.id)
    try {
      await window.electronAPI!.animeManifest.import(anime.directoryCid, pin)
    } finally {
      setImportingId(null)
    }
  }

  return (
    <Container maxW="container.xl" py={8}>
      <VStack align="stretch" gap={6}>
        {/* Заголовок */}
        <HStack justify="space-between">
          <Heading size="xl">
            <LuGlobe size={24} style={{ marginRight: 12 }} />
            Каталог трекера
          </Heading>
          <Badge colorPalette="blue" size="lg">
            <LuCloud size={16} style={{ marginRight: 4 }} />
            {total} аниме
          </Badge>
        </HStack>

        {/* Поиск */}
        <HStack>
          <Box position="relative" flex={1}>
            <Input
              placeholder="Поиск аниме..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              pl={10}
            />
            <LuSearch
              size={16}
              color="var(--chakra-colors-fg-muted)"
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
          </Box>
          <Button onClick={loadCatalog} variant="outline">
            Обновить
          </Button>
        </HStack>

        {/* Состояние загрузки */}
        {loading && (
          <Box textAlign="center" py={16}>
            <Spinner size="xl" />
            <Text mt={4} color="fg.muted">
              Загрузка каталога...
            </Text>
          </Box>
        )}

        {/* Ошибка */}
        {error && (
          <Box textAlign="center" py={16}>
            <Text color="red.500" mb={4}>
              {error}
            </Text>
            <Button onClick={loadCatalog}>Попробовать снова</Button>
          </Box>
        )}

        {/* Грид аниме */}
        {!loading && !error && animeList.length === 0 && (
          <Box textAlign="center" py={16}>
            <Text color="fg.muted" fontSize="lg">
              {search ? 'Ничего не найдено' : 'Каталог пуст'}
            </Text>
          </Box>
        )}

        {!loading && !error && animeList.length > 0 && (
          <>
            <Grid
              templateColumns={{
                base: '1fr',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
                lg: 'repeat(4, 1fr)',
                xl: 'repeat(5, 1fr)',
              }}
              gap={4}
            >
              {animeList.map((anime) => {
                const localId = (anime.directoryCid && localAnimeMap.get(`dir:${anime.directoryCid}`))
                  || (anime.shikimoriId && localAnimeMap.get(`shiki:${anime.shikimoriId}`))
                  || null
                const isLocal = !!localId
                const StatusIcon = isLocal ? LuLibrary : LuCloud

                return (
                  <Box
                    key={anime.id}
                    borderWidth="1px"
                    borderRadius="xl"
                    overflow="hidden"
                    transition="all 0.2s"
                    cursor="pointer"
                    _hover={{ shadow: 'lg', transform: 'translateY(-2px)' }}
                    onClick={() => router.push(`/discover/${anime.id}`)}
                  >
                    {/* Постер */}
                    <Box position="relative">
                      <Box w="100%" aspectRatio="2/3" bg="bg.subtle" position="relative">
                        {getCoverUrl(anime.coverUrl)
                          ? (
                            <Image
                              src={getCoverUrl(anime.coverUrl)}
                              alt={anime.title}
                              w="100%"
                              h="100%"
                              objectFit="cover"
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              position="absolute"
                              inset={0}
                            />
                          )
                          : (
                            <Box w="100%" h="100%" display="flex" alignItems="center" justifyContent="center">
                              <Text color="fg.muted">Нет постера</Text>
                            </Box>
                          )}
                      </Box>
                      {/* Бейдж статуса */}
                      <Badge position="absolute" top={2} right={2} colorPalette={isLocal ? 'green' : 'blue'} size="sm">
                        <StatusIcon size={16} style={{ marginRight: 4 }} />
                        {isLocal ? 'В библиотеке' : 'Удалённо'}
                      </Badge>
                    </Box>

                    {/* Информация */}
                    <VStack align="stretch" p={3} gap={2}>
                      <Text fontWeight="semibold" lineClamp={2} fontSize="sm">
                        {anime.title}
                      </Text>
                      {anime.titleOriginal && (
                        <Text fontSize="xs" color="fg.muted" lineClamp={1}>
                          {anime.titleOriginal}
                        </Text>
                      )}

                      <HStack gap={1} flexWrap="wrap">
                        {anime.year && (
                          <Badge size="sm" variant="subtle">
                            {anime.year}
                          </Badge>
                        )}
                        {(anime.episodeCount ?? anime.episodes?.length ?? 0) > 0 && (
                          <Badge size="sm" variant="subtle">
                            {anime.episodeCount ?? anime.episodes?.length} эп.
                          </Badge>
                        )}
                      </HStack>

                      {/* Кнопки */}
                      {isLocal
                        ? (
                          <Button
                            size="xs"
                            colorPalette="green"
                            variant="outline"
                            flex={1}
                            onClick={(e) => {
                              e.stopPropagation()
                              router.push(`/library/${localId}`)
                            }}
                          >
                            <LuLibrary size={16} style={{ marginRight: 4 }} />
                            Открыть в библиотеке
                          </Button>
                        )
                        : (
                          <HStack gap={2}>
                            <Button
                              size="xs"
                              colorPalette="blue"
                              flex={1}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddToLibrary(anime.id)
                              }}
                              loading={addingId === anime.id}
                            >
                              <LuPlus size={16} style={{ marginRight: 4 }} />В библиотеку
                            </Button>
                            {anime.directoryCid && (
                              <>
                                <Button
                                  size="xs"
                                  colorPalette="green"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleImport(anime, true)
                                  }}
                                  loading={importingId === anime.id}
                                  title="Импортировать и закрепить локально"
                                >
                                  <LuDownload size={16} />
                                </Button>
                                <Button
                                  size="xs"
                                  colorPalette="blue"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleImport(anime, false)
                                  }}
                                  loading={importingId === anime.id}
                                  title="Добавить в облако (без скачивания)"
                                >
                                  <LuCloud size={16} />
                                </Button>
                              </>
                            )}
                          </HStack>
                        )}
                    </VStack>
                  </Box>
                )
              })}
            </Grid>

            {/* Пагинация */}
            {total > limit && (
              <HStack justify="center" gap={4}>
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                  Назад
                </Button>
                <Text color="fg.muted">
                  {page} / {Math.ceil(total / limit)}
                </Text>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= Math.ceil(total / limit)}
                  onClick={() => setPage(page + 1)}
                >
                  Далее
                </Button>
              </HStack>
            )}
          </>
        )}
      </VStack>
    </Container>
  )
}
