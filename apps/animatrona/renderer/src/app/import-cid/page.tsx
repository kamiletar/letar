'use client'

/**
 * Страница просмотра аниме по CID из IPFS
 *
 * Позволяет ввести CID манифеста, просмотреть информацию и сразу смотреть
 * эпизоды напрямую из IPFS без импорта в библиотеку.
 */

import { Badge, Box, Button, Card, Heading, HStack, IconButton, Input, Spinner, Text, VStack } from '@chakra-ui/react'
import type { AnimeManifestEpisode, EpisodesDocument } from '@letar/animatrona-types'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { LuCalendar, LuChevronLeft, LuDownload, LuFilm, LuPin, LuPlay, LuSearch, LuX } from 'react-icons/lu'

import { AlreadyInLibraryBadge } from '@/components/import/AlreadyInLibraryBadge'
import { Header } from '@/components/layout'
import { VideoPlayer } from '@/components/player/VideoPlayer'
import { toaster } from '@/components/ui/toaster'
import { getGatewayBaseUrl, toPlayableUrl } from '@/lib/media-url'
import type { AnimeInfo, AnimeManifest, AnimeManifestGenre, AnimeManifestStudio } from '@/types/electron'

// Отключаем статическую генерацию
export const dynamic = 'force-dynamic'

/**
 * Форматирование длительности в мм:сс
 */
function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

/**
 * Форматирование размера файла
 */
function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Страница просмотра аниме по CID (стрим без импорта)
 */
export default function ImportCidPage() {
  return (
    <Suspense fallback={<Box minH="100vh" bg="bg" />}>
      <ImportCidContentEmbedded />
    </Suspense>
  )
}

/** Контент страницы без Header — для встраивания в табы */
export function ImportCidContentEmbedded() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const autoPreviewTriggered = useRef(false)

  // State: загрузка манифеста
  const [cidInput, setCidInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [manifest, setManifest] = useState<AnimeManifest | null>(null)
  const [animeInfo, setAnimeInfo] = useState<AnimeInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  // State: эпизоды и плеер
  const [episodes, setEpisodes] = useState<AnimeManifestEpisode[]>([])
  const [loadingEpisodes, setLoadingEpisodes] = useState(false)
  const [selectedEpisode, setSelectedEpisode] = useState<AnimeManifestEpisode | null>(null)

  // State: импорт (опционально)
  const [isImporting, setIsImporting] = useState(false)

  /**
   * Загрузить превью манифеста из IPFS
   */
  const handlePreview = useCallback(
    async (overrideCid?: string) => {
      const cid = (overrideCid || cidInput).trim()
      if (!cid) {
        setError('Введите CID аниме')
        return
      }

      setIsLoading(true)
      setError(null)
      setManifest(null)
      setAnimeInfo(null)
      setEpisodes([])
      setSelectedEpisode(null)

      try {
        if (!window.electronAPI) {
          setError('Electron API недоступен')
          return
        }
        const result = await window.electronAPI.animeManifest.get(cid)
        if (!result.success || !result.data) {
          setError(result.error || 'Не удалось загрузить манифест')
          return
        }
        setManifest(result.data)

        // Загружаем AnimeInfo для метаданных
        const infoResult = await window.electronAPI.animeInfo.get(result.data.animeInfoCid)
        if (infoResult.success && infoResult.data) {
          setAnimeInfo(infoResult.data)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки')
      } finally {
        setIsLoading(false)
      }
    },
    [cidInput],
  )

  // Загрузить эпизоды из IPFS после загрузки манифеста
  useEffect(() => {
    if (!manifest?.episodesCid) {
      return
    }

    const loadEpisodes = async () => {
      setLoadingEpisodes(true)
      try {
        const url = `${getGatewayBaseUrl()}/ipfs/${manifest.episodesCid}`
        const res = await fetch(url)
        const data = (await res.json()) as EpisodesDocument
        const sorted = (data.episodes || []).sort(
          (a: AnimeManifestEpisode, b: AnimeManifestEpisode) => a.number - b.number,
        )
        setEpisodes(sorted)
      } catch {
        // Если не получилось загрузить эпизоды — не критично
        console.error('Не удалось загрузить список эпизодов')
      } finally {
        setLoadingEpisodes(false)
      }
    }

    void loadEpisodes()
  }, [manifest?.episodesCid])

  /**
   * Импортировать аниме в библиотеку (опционально)
   */
  const handleImport = useCallback(
    async (pin = false) => {
      const cid = cidInput.trim()
      if (!cid || !manifest) {
        return
      }

      setIsImporting(true)

      try {
        if (!window.electronAPI) {
          toaster.error({ title: 'Electron API недоступен' })
          return
        }
        const result = await window.electronAPI.animeManifest.import(cid, pin)
        if (!result.success || !result.data) {
          toaster.error({
            title: 'Ошибка импорта',
            description: result.error || 'Не удалось импортировать аниме',
          })
          return
        }

        toaster.success({
          title: pin ? 'Импорт и пиннинг запущены' : 'Импорт завершён',
          description: `${result.data.animeName} (${result.data.episodeCount} эпизодов)`,
        })

        router.push(`/library/${result.data.animeId}`)
      } catch (err) {
        toaster.error({
          title: 'Ошибка импорта',
          description: err instanceof Error ? err.message : 'Неизвестная ошибка',
        })
      } finally {
        setIsImporting(false)
      }
    },
    [cidInput, manifest, router],
  )

  // Автозагрузка CID из search params (deep link: animatrona://import/<cid>)
  useEffect(() => {
    const cidFromUrl = searchParams.get('cid')
    if (cidFromUrl && !autoPreviewTriggered.current) {
      autoPreviewTriggered.current = true
      setCidInput(cidFromUrl)
      void handlePreview(cidFromUrl)
    }
  }, [searchParams, handlePreview])

  /**
   * Обработка Enter в поле ввода
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        handlePreview()
      }
    },
    [handlePreview, isLoading],
  )

  /**
   * Воспроизвести эпизод
   */
  const handlePlay = useCallback((ep: AnimeManifestEpisode) => {
    if (!ep.videoCid) {
      return
    }
    setSelectedEpisode(ep)
  }, [])

  /**
   * Переход к следующему/предыдущему эпизоду
   */
  const currentIndex = selectedEpisode ? episodes.findIndex((e) => e.number === selectedEpisode.number) : -1
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex >= 0 && currentIndex < episodes.length - 1

  const handlePrevEpisode = useCallback(() => {
    if (hasPrev) {
      setSelectedEpisode(episodes[currentIndex - 1])
    }
  }, [hasPrev, episodes, currentIndex])

  const handleNextEpisode = useCallback(() => {
    if (hasNext) {
      setSelectedEpisode(episodes[currentIndex + 1])
    }
  }, [hasNext, episodes, currentIndex])

  /** Автоплей следующего эпизода */
  const handleEpisodeEnded = useCallback(() => {
    if (hasNext) {
      setSelectedEpisode(episodes[currentIndex + 1])
    }
  }, [hasNext, episodes, currentIndex])

  // Генерация URL для видео текущего эпизода
  const videoUrl = selectedEpisode?.videoCid ? toPlayableUrl({ cid: selectedEpisode.videoCid }) : null

  return (
    <Box minH="100vh" bg="bg" color="fg">
      {/* Плеер (когда выбран эпизод) */}
      {selectedEpisode && videoUrl && (
        <Box bg="black" position="relative">
          {/* Кнопка закрытия плеера */}
          <Box position="absolute" top={2} right={2} zIndex={10}>
            <IconButton
              aria-label="Закрыть плеер"
              size="sm"
              variant="ghost"
              color="white"
              onClick={() => setSelectedEpisode(null)}
            >
              <LuX />
            </IconButton>
          </Box>

          <Box maxH="70vh" aspectRatio="16/9" mx="auto">
            <VideoPlayer
              key={selectedEpisode.videoCid}
              src={videoUrl}
              autoPlay
              hasPrevEpisode={hasPrev}
              hasNextEpisode={hasNext}
              onPrevEpisode={handlePrevEpisode}
              onNextEpisode={handleNextEpisode}
              onEnded={handleEpisodeEnded}
              prevEpisodeTooltip={hasPrev ? `Эпизод ${episodes[currentIndex - 1].number}` : undefined}
              nextEpisodeTooltip={hasNext ? `Эпизод ${episodes[currentIndex + 1].number}` : undefined}
              headerCenter={
                <Text color="white" fontSize="sm" fontWeight="medium">
                  {manifest?.name} — Эпизод {selectedEpisode.number}
                  {selectedEpisode.name ? ` — ${selectedEpisode.name}` : ''}
                </Text>
              }
              headerLeft={
                <IconButton
                  aria-label="Назад"
                  variant="ghost"
                  color="white"
                  size="sm"
                  onClick={() => setSelectedEpisode(null)}
                >
                  <LuChevronLeft />
                </IconButton>
              }
            />
          </Box>
        </Box>
      )}

      {/* Хедер (скрыт когда плеер активен) */}
      {!selectedEpisode && <Header title="Смотреть из IPFS" />}

      <Box p={6} maxW="800px" mx="auto">
        <VStack gap={6} align="stretch">
          {/* Заголовок и ввод CID (скрыт если уже загружено) */}
          {!manifest && (
            <>
              <VStack gap={2} align="start">
                <Heading size="lg">Смотреть аниме из IPFS</Heading>
                <Text color="fg.muted">
                  Введите CID аниме (директория или манифест) — можно смотреть напрямую без импорта в библиотеку.
                </Text>
              </VStack>

              <Card.Root>
                <Card.Body>
                  <VStack gap={4} align="stretch">
                    <Text fontWeight="medium">CID аниме</Text>
                    <HStack gap={3}>
                      <Input
                        placeholder="bafy... или Qm..."
                        value={cidInput}
                        onChange={(e) => setCidInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        fontFamily="mono"
                        flex={1}
                      />
                      <Button colorPalette="purple" onClick={() => handlePreview()} loading={isLoading}>
                        <LuSearch size={16} style={{ marginRight: 8 }} />
                        Найти
                      </Button>
                    </HStack>
                    {error && <Text color="red.500">{error}</Text>}
                  </VStack>
                </Card.Body>
              </Card.Root>
            </>
          )}

          {/* Загрузка */}
          {isLoading && (
            <Card.Root>
              <Card.Body>
                <HStack justify="center" py={8}>
                  <Spinner size="lg" color="purple.500" />
                  <Text>Загрузка из IPFS...</Text>
                </HStack>
              </Card.Body>
            </Card.Root>
          )}

          {/* Информация об аниме (компактно) */}
          {manifest && (
            <Card.Root>
              <Card.Body>
                <HStack gap={4} align="start">
                  <VStack flex={1} gap={2} align="start">
                    <Heading size="md">{manifest.name}</Heading>
                    {animeInfo?.originalName && (
                      <Text color="fg.muted" fontSize="sm">
                        {animeInfo.originalName}
                      </Text>
                    )}
                    <HStack flexWrap="wrap" gap={2}>
                      {animeInfo?.year && (
                        <Badge variant="subtle">
                          <LuCalendar size={16} style={{ marginRight: 4 }} />
                          {animeInfo.year}
                        </Badge>
                      )}
                      {animeInfo?.status && (
                        <Badge colorPalette={animeInfo.status === 'COMPLETED' ? 'green' : 'blue'}>
                          {animeInfo.status === 'COMPLETED' ? 'Завершён' : 'Онгоинг'}
                        </Badge>
                      )}
                      {episodes.length > 0 && (
                        <Badge variant="subtle">
                          <LuFilm size={16} style={{ marginRight: 4 }} />
                          {episodes.length} эп.
                        </Badge>
                      )}
                    </HStack>
                    {/* Жанры */}
                    {animeInfo?.genres && animeInfo.genres.length > 0 && (
                      <HStack flexWrap="wrap" gap={1}>
                        {animeInfo.genres.map((g: AnimeManifestGenre) => (
                          <Badge key={g.name} variant="outline" size="sm">
                            {g.nameRu || g.name}
                          </Badge>
                        ))}
                      </HStack>
                    )}
                    {/* Студии */}
                    {animeInfo?.studios && animeInfo.studios.length > 0 && (
                      <Text color="fg.muted" fontSize="sm">
                        {animeInfo.studios.map((s: AnimeManifestStudio) => s.name).join(', ')}
                      </Text>
                    )}
                  </VStack>

                  {/* Кнопки действий */}
                  <VStack gap={2} align="stretch" minW="160px">
                    <Button
                      size="sm"
                      variant="outline"
                      colorPalette="green"
                      onClick={() => handleImport(false)}
                      loading={isImporting}
                    >
                      <LuDownload size={16} style={{ marginRight: 4 }} />В библиотеку
                    </Button>
                    <Button
                      size="sm"
                      variant="subtle"
                      colorPalette="purple"
                      onClick={() => handleImport(true)}
                      loading={isImporting}
                    >
                      <LuPin size={16} style={{ marginRight: 4 }} />В библиотеку + пин
                    </Button>
                  </VStack>
                </HStack>

                {/* Описание */}
                {animeInfo?.description && (
                  <Text color="fg.muted" fontSize="sm" mt={3} lineClamp={3}>
                    {animeInfo.description}
                  </Text>
                )}

                {/* Предупреждение если уже в библиотеке */}
                <AlreadyInLibraryBadge shikimoriId={animeInfo?.externalIds?.shikimori} />
              </Card.Body>
            </Card.Root>
          )}

          {/* Загрузка эпизодов */}
          {loadingEpisodes && (
            <HStack justify="center" py={4}>
              <Spinner size="sm" color="purple.500" />
              <Text color="fg.muted">Загрузка списка эпизодов...</Text>
            </HStack>
          )}

          {/* Список эпизодов */}
          {episodes.length > 0 && (
            <Card.Root>
              <Card.Header pb={2}>
                <Heading size="sm">Эпизоды</Heading>
              </Card.Header>
              <Card.Body pt={0}>
                <VStack gap={1} align="stretch">
                  {episodes.map((ep) => {
                    const isActive = selectedEpisode?.number === ep.number
                    const canPlay = !!ep.videoCid

                    return (
                      <HStack
                        key={ep.number}
                        px={3}
                        py={2}
                        bg={isActive ? 'purple.500/10' : 'transparent'}
                        borderRadius="md"
                        cursor={canPlay ? 'pointer' : 'default'}
                        _hover={canPlay ? { bg: isActive ? 'purple.500/15' : 'bg.subtle' } : {}}
                        onClick={() => canPlay && handlePlay(ep)}
                        transition="background 0.15s"
                      >
                        {/* Номер */}
                        <Text fontWeight="bold" fontSize="sm" minW="28px" color={isActive ? 'purple.400' : 'fg'}>
                          {ep.number}
                        </Text>

                        {/* Название */}
                        <Text flex={1} fontSize="sm" color={isActive ? 'purple.300' : 'fg'} truncate>
                          {ep.name || `Эпизод ${ep.number}`}
                        </Text>

                        {/* Мета */}
                        <HStack gap={3}>
                          {ep.durationMs && (
                            <Text fontSize="xs" color="fg.muted">
                              {formatDuration(ep.durationMs)}
                            </Text>
                          )}
                          {ep.size > 0 && (
                            <Text fontSize="xs" color="fg.muted" minW="60px" textAlign="right">
                              {formatSize(ep.size)}
                            </Text>
                          )}
                          {canPlay
                            ? (
                              <IconButton
                                aria-label={`Смотреть эпизод ${ep.number}`}
                                size="xs"
                                variant={isActive ? 'solid' : 'ghost'}
                                colorPalette="purple"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePlay(ep)
                                }}
                              >
                                <LuPlay />
                              </IconButton>
                            )
                            : (
                              <Text fontSize="xs" color="fg.subtle">
                                нет видео
                              </Text>
                            )}
                        </HStack>
                      </HStack>
                    )
                  })}
                </VStack>
              </Card.Body>
            </Card.Root>
          )}
        </VStack>
      </Box>
    </Box>
  )
}
