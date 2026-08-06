'use client'

/**
 * Страница импорта аниме из Рутрекера
 *
 * Пользователь вставляет ссылку или HTML страницы раздачи,
 * парсер извлекает метаданные, матчер находит аниме на Shikimori,
 * показывает превью для подтверждения.
 */

import {
  Badge,
  Box,
  Button,
  Card,
  Heading,
  HStack,
  Icon,
  Image,
  Input,
  Progress,
  Spinner,
  Switch,
  Text,
  Textarea,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuCaptions,
  LuCheck,
  LuCopy,
  LuDownload,
  LuFileAudio,
  LuFilm,
  LuInfo,
  LuLayers,
  LuLink,
  LuPencil,
  LuPlus,
  LuSearch,
  LuSquare,
  LuX,
} from 'react-icons/lu'

import { AlreadyInLibraryBadge } from '@/components/import/AlreadyInLibraryBadge'
import { BundleAnimesPanel as SharedBundleAnimesPanel } from '@/components/import/BundleAnimesPanel'
import { Header } from '@/components/layout'
import { toaster } from '@/components/ui/toaster'
import type { RutrackerCandidateScore, RutrackerMatchResult, RutrackerTorrentInfo } from '@/types/electron'

export const dynamic = 'force-dynamic'

/** Состояние импорта */
type ImportStep = 'input' | 'loading' | 'preview' | 'downloading' | 'done' | 'error'

/** Прогресс скачивания */
interface DownloadProgress {
  infoHash: string
  progress: number
  downloadSpeed: number
  uploadSpeed: number
  numPeers: number
  downloaded: number
  totalSize: number
}

/** Данные раздачи Рутрекера (алиас канонического IPC-типа) */
type TorrentInfo = RutrackerTorrentInfo

/** Данные Shikimori для превью — до `confirmMatch` доступен только этот усечённый набор полей */
interface PreviewShikimoriData {
  id: string
  name: string
  russian: string | null
  poster: { mainUrl: string } | null
  score: number | null
  episodes: number
  kind: string | null
  status: string
}

interface ImportResult {
  torrent: RutrackerTorrentInfo
  match: RutrackerMatchResult | null
  needsConfirmation: boolean
  candidates: RutrackerCandidateScore[]
  shikimoriData?: PreviewShikimoriData
}

/** Аниме в наборе (bundle) */
interface BundleAnimeEntry {
  shikimoriId: number
  animeName: string
}

/** Контент страницы без Header — для встраивания в табы */
export function ImportRutrackerContent() {
  const [step, setStep] = useState<ImportStep>('input')
  const [htmlInput, setHtmlInput] = useState('')
  const [urlInput, setUrlInput] = useState('')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null)
  const [downloadInfoHash, setDownloadInfoHash] = useState<string | null>(null)
  /** Текущий этап импорта (приходит через IPC) */
  const [importStep, setImportStep] = useState<string>('Парсинг и поиск на Shikimori...')
  /** Bundle: раздача содержит несколько разных аниме */
  const [isBundle, setIsBundle] = useState(false)
  /** Bundle: список аниме в наборе */
  const [bundleAnimes, setBundleAnimes] = useState<BundleAnimeEntry[]>([])
  const unsubProgressRef = useRef<(() => void) | null>(null)
  const unsubDoneRef = useRef<(() => void) | null>(null)
  const unsubStepRef = useRef<(() => void) | null>(null)

  // Очистка подписок при unmount
  useEffect(() => {
    return () => {
      unsubProgressRef.current?.()
      unsubDoneRef.current?.()
      unsubStepRef.current?.()
    }
  }, [])

  const handleImport = useCallback(async () => {
    let html = htmlInput.trim()
    const url = urlInput.trim()

    if (!html && !url) {
      toaster.error({ title: 'Вставьте URL или HTML страницы раздачи' })
      return
    }

    setStep('loading')
    setError(null)
    setImportStep('Парсинг и поиск на Shikimori...')

    try {
      const api = window.electronAPI
      if (!api?.rutracker) {
        throw new Error('API не доступен. Перезапустите приложение.')
      }

      // Подписываемся на этапы импорта из main process
      unsubStepRef.current?.()
      if (api.rutracker.onImportStep) {
        unsubStepRef.current = api.rutracker.onImportStep((step: string) => {
          setImportStep(step)
        })
      }

      // Если HTML не вставлен, загружаем по URL
      if (!html && url) {
        setImportStep('Загрузка страницы...')
        const fetchResponse = await api.rutracker.fetchPage(url)
        if (!fetchResponse.success || !fetchResponse.data) {
          throw new Error(`Загрузка страницы: ${fetchResponse.error || 'Не удалось загрузить'}`)
        }
        console.log('[Import] Страница загружена, HTML:', fetchResponse.data.length, 'символов')
        html = fetchResponse.data
      }

      const effectiveUrl = url || 'https://rutracker.org/forum/viewtopic.php?t=0'
      console.log('[Import] Парсинг + Shikimori матчинг...')
      const response = await api.rutracker.import(html, effectiveUrl)
      if (!response.success || !response.data) {
        throw new Error(response.error || 'Ошибка парсинга')
      }
      console.log(
        '[Import] Результат:',
        response.data.match ? `матч ID=${response.data.match.shikimoriId}` : 'матч не найден',
      )

      setResult(response.data as ImportResult)
      setStep('preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Неизвестная ошибка')
      setStep('error')
    }
  }, [htmlInput, urlInput])

  const handleStartDownload = useCallback(async () => {
    if (!result) {
      return
    }

    const api = window.electronAPI
    if (!api?.rutracker || !api?.torrent) {
      toaster.error({ title: 'API не доступен' })
      return
    }

    try {
      // Подтверждаем Shikimori match (загружаем полные данные)
      const matchId = result.match?.shikimoriId
      if (!matchId) {
        toaster.error({ title: 'Не выбрано аниме на Shikimori' })
        return
      }

      setStep('loading')
      const confirmResponse = await api.rutracker.confirmMatch(matchId)
      if (!confirmResponse.success || !confirmResponse.data) {
        throw new Error(confirmResponse.error || 'Не удалось загрузить данные Shikimori')
      }

      // Проверяем, есть ли аниме уже в библиотеке
      if (api.library?.checkAnimeExists) {
        try {
          const existsRes = await api.library.checkAnimeExists(matchId)
          if (existsRes.success && existsRes.data?.exists) {
            const animeName = existsRes.data.animeName || confirmResponse.data.russian || confirmResponse.data.name
            const proceed = window.confirm(`«${animeName}» уже есть в библиотеке.\n\nВсё равно скачать торрент?`)
            if (!proceed) {
              setStep('preview')
              return
            }
          }
        } catch {
          // Не блокируем скачивание при ошибке проверки
        }
      }

      // Подписываемся на прогресс
      unsubProgressRef.current = api.torrent.onProgress((info) => {
        // TorrentProgress — компактный формат без totalSize, сохраняем его из предыдущего состояния
        setDownloadProgress((prev) => ({
          infoHash: info.infoHash,
          progress: info.progress,
          downloadSpeed: info.downloadSpeed,
          uploadSpeed: info.uploadSpeed,
          numPeers: info.numPeers,
          downloaded: info.downloaded,
          totalSize: prev?.totalSize ?? 0,
        }))
      })

      // Подписываемся на завершение
      unsubDoneRef.current = api.torrent.onDone((info) => {
        if (info.infoHash === downloadInfoHash || downloadInfoHash === null) {
          setStep('done')
          toaster.success({ title: 'Скачивание завершено, файлы добавлены в очередь импорта' })
          unsubProgressRef.current?.()
          unsubDoneRef.current?.()
        }
      })

      // Подтягиваем настройки торрент-клиента
      const { loadTorrentSettings } = await import('../settings/_settings/TorrentSettingsCard')
      const torrentSettings = loadTorrentSettings()

      // Запускаем скачивание
      const downloadResponse = await api.rutracker.startDownload({
        // result.shikimoriData — усечённый превью-набор полей, для IPC нужны полные данные
        importResult: { ...result, shikimoriData: confirmResponse.data },
        shikimoriData: confirmResponse.data,
        downloadPath: torrentSettings.downloadPath || undefined,
        isBundle,
        bundleAnimesJson: isBundle && bundleAnimes.length > 0 ? JSON.stringify(bundleAnimes) : undefined,
      })

      if (!downloadResponse.success || !downloadResponse.data) {
        throw new Error(downloadResponse.error || 'Ошибка запуска скачивания')
      }

      setDownloadInfoHash(downloadResponse.data.infoHash)
      setDownloadProgress({
        infoHash: downloadResponse.data.infoHash,
        progress: 0,
        downloadSpeed: 0,
        uploadSpeed: 0,
        numPeers: 0,
        downloaded: 0,
        totalSize: downloadResponse.data.torrent.totalSize,
      })
      setStep('downloading')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка скачивания')
      setStep('error')
    }
  }, [result, downloadInfoHash, isBundle, bundleAnimes])

  const handleCancelDownload = useCallback(async () => {
    if (!downloadInfoHash) {
      return
    }

    const api = window.electronAPI
    if (!api?.rutracker) {
      return
    }

    await api.rutracker.cancelDownload(downloadInfoHash, true)
    unsubProgressRef.current?.()
    unsubDoneRef.current?.()
    setDownloadInfoHash(null)
    setDownloadProgress(null)
    setStep('preview')
    toaster.info({ title: 'Скачивание отменено' })
  }, [downloadInfoHash])

  /** Сбросить визард для нового импорта, не отменяя текущую загрузку */
  const handleAddMore = useCallback(() => {
    unsubProgressRef.current?.()
    unsubDoneRef.current?.()
    setStep('input')
    setHtmlInput('')
    setUrlInput('')
    setResult(null)
    setError(null)
    setDownloadProgress(null)
    setDownloadInfoHash(null)
    setIsBundle(false)
    setBundleAnimes([])
  }, [])

  const handleReset = useCallback(() => {
    unsubProgressRef.current?.()
    unsubDoneRef.current?.()
    setStep('input')
    setHtmlInput('')
    setUrlInput('')
    setResult(null)
    setError(null)
    setDownloadProgress(null)
    setDownloadInfoHash(null)
    setIsBundle(false)
    setBundleAnimes([])
  }, [])

  const handleCopyMagnet = useCallback(() => {
    if (result?.torrent.magnetLink) {
      navigator.clipboard.writeText(result.torrent.magnetLink)
      toaster.success({ title: 'Магнет-ссылка скопирована' })
    }
  }, [result])

  return (
    <Box p={4} maxW="900px" mx="auto">
      {step === 'input' && (
        <InputStep
          htmlInput={htmlInput}
          urlInput={urlInput}
          onHtmlChange={setHtmlInput}
          onUrlChange={setUrlInput}
          onSubmit={handleImport}
        />
      )}

      {step === 'loading' && (
        <VStack gap={4} py={12}>
          <Spinner size="xl" />
          <Text color="fg.muted">{importStep}</Text>
        </VStack>
      )}

      {step === 'preview' && result && (
        <PreviewStep
          result={result}
          isBundle={isBundle}
          bundleAnimes={bundleAnimes}
          onBundleChange={setIsBundle}
          onBundleAnimesChange={setBundleAnimes}
          onCopyMagnet={handleCopyMagnet}
          onStartDownload={handleStartDownload}
          onReset={handleReset}
          onMatchChange={(newId, newName, russian) => {
            setResult((prev) =>
              prev
                ? {
                  ...prev,
                  match: {
                    shikimoriId: newId,
                    confidence: 1,
                    method: 'search-title',
                    details: 'Выбрано вручную',
                  },
                  shikimoriData: {
                    id: String(newId),
                    name: newName,
                    russian: russian,
                    poster: prev.shikimoriData?.poster ?? null,
                    score: null,
                    episodes: 0,
                    kind: null,
                    status: 'released',
                  },
                }
                : prev
            )
          }}
        />
      )}

      {step === 'downloading' && downloadProgress && (
        <DownloadingStep
          progress={downloadProgress}
          animeName={result?.torrent.nameRu ?? ''}
          onCancel={handleCancelDownload}
          onAddMore={handleAddMore}
        />
      )}

      {step === 'done' && <DoneStep animeName={result?.torrent.nameRu ?? ''} onReset={handleReset} />}

      {step === 'error' && <ErrorStep error={error} onRetry={handleReset} />}
    </Box>
  )
}

/** Страница-обёртка для прямого роутинга */
export default function ImportRutrackerPage() {
  return (
    <Box>
      <Header title="Импорт из Rutracker" />
      <ImportRutrackerContent />
    </Box>
  )
}

/** Шаг 1: Ввод данных */
function InputStep({
  htmlInput,
  urlInput,
  onHtmlChange,
  onUrlChange,
  onSubmit,
}: {
  htmlInput: string
  urlInput: string
  onHtmlChange: (v: string) => void
  onUrlChange: (v: string) => void
  onSubmit: () => void
}) {
  return (
    <VStack gap={4} align="stretch">
      <Card.Root>
        <Card.Header>
          <Heading size="md">
            <HStack>
              <Icon>
                <LuLink />
              </Icon>
              <Text>Вставьте URL или HTML страницы раздачи</Text>
            </HStack>
          </Heading>
        </Card.Header>
        <Card.Body>
          <VStack gap={3} align="stretch">
            <Input
              placeholder="https://rutracker.org/forum/viewtopic.php?t=..."
              value={urlInput}
              onChange={(e) => onUrlChange(e.target.value)}
            />
            <Textarea
              placeholder="Вставьте сюда HTML страницы раздачи (Ctrl+U в браузере → скопировать весь текст)"
              value={htmlInput}
              onChange={(e) => onHtmlChange(e.target.value)}
              rows={8}
              fontFamily="mono"
              fontSize="xs"
            />
            <Text fontSize="xs" color="fg.muted">
              Вставьте URL — HTML загрузится автоматически. Или: Ctrl+U (исходный код) → Ctrl+A → Ctrl+C → вставьте HTML
            </Text>
          </VStack>
        </Card.Body>
      </Card.Root>

      <Button colorPalette="blue" size="lg" onClick={onSubmit} disabled={!htmlInput.trim() && !urlInput.trim()}>
        <Icon>
          <LuSearch />
        </Icon>
        Парсить и найти на Shikimori
      </Button>
    </VStack>
  )
}

/** Шаг 2: Превью результата */
function PreviewStep({
  result,
  isBundle,
  bundleAnimes,
  onBundleChange,
  onBundleAnimesChange,
  onCopyMagnet,
  onStartDownload,
  onReset,
  onMatchChange,
}: {
  result: ImportResult
  isBundle: boolean
  bundleAnimes: BundleAnimeEntry[]
  onBundleChange: (v: boolean) => void
  onBundleAnimesChange: (v: BundleAnimeEntry[]) => void
  onCopyMagnet: () => void
  onStartDownload: () => void
  onReset: () => void
  onMatchChange: (newShikimoriId: number, newName: string, russian: string | null) => void
}) {
  const { torrent, match, shikimoriData } = result

  const canDownload = match && (!isBundle || bundleAnimes.length >= 2)

  return (
    <VStack gap={4} align="stretch">
      {/* Заголовок */}
      <Card.Root>
        <Card.Body>
          <HStack justify="space-between" align="start">
            <VStack align="start" gap={1}>
              <Heading size="lg">{torrent.nameRu}</Heading>
              {torrent.nameOriginal !== torrent.nameRu && (
                <Text color="fg.muted" fontSize="md">
                  {torrent.nameOriginal}
                </Text>
              )}
              <HStack gap={2} flexWrap="wrap">
                {torrent.type && <Badge colorPalette="blue">{torrent.type}</Badge>}
                {torrent.year && <Badge colorPalette="gray">{torrent.year}</Badge>}
                {torrent.episodeInfo && <Badge colorPalette="green">{torrent.episodeInfo}</Badge>}
                {torrent.resolution && <Badge colorPalette="purple">{torrent.resolution}</Badge>}
                {torrent.sourceType && <Badge colorPalette="orange">{torrent.sourceType}</Badge>}
              </HStack>
            </VStack>
            {torrent.posterUrl && (
              <Image src={torrent.posterUrl} alt={torrent.nameRu} maxH="120px" borderRadius="md" objectFit="cover" />
            )}
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Матчинг с Shikimori */}
      <ShikimoriMatchCard
        match={match}
        shikimoriData={shikimoriData}
        torrentExternalLinks={torrent.externalLinks}
        onMatchChange={onMatchChange}
      />

      {/* Переключатель «Набор» */}
      <Card.Root>
        <Card.Body>
          <HStack justify="space-between">
            <VStack align="start" gap={0}>
              <HStack gap={2}>
                <Icon color={isBundle ? 'blue.400' : 'fg.muted'}>
                  <LuLayers />
                </Icon>
                <Text fontWeight="medium">Набор (несколько аниме в раздаче)</Text>
              </HStack>
              <Text fontSize="xs" color="fg.muted" ml={6}>
                Например, Ghost in the Shell ARISE — 4 ОВА с разными ID на Shikimori
              </Text>
            </VStack>
            <Switch.Root checked={isBundle} onCheckedChange={(e) => onBundleChange(e.checked)} colorPalette="blue">
              <Switch.HiddenInput />
              <Switch.Control>
                <Switch.Thumb />
              </Switch.Control>
            </Switch.Root>
          </HStack>
        </Card.Body>
      </Card.Root>

      {/* Панель набора */}
      {isBundle && (
        <SharedBundleAnimesPanel
          animes={bundleAnimes}
          seedShikimoriId={match?.shikimoriId}
          onChange={onBundleAnimesChange}
        />
      )}

      {/* Техническая информация */}
      <HStack gap={4} align="start" flexWrap="wrap">
        <TechnicalInfoCard torrent={torrent} />
        <DubSubCard dubGroups={torrent.dubGroups} />
      </HStack>

      {/* Действия */}
      <VStack gap={2} align="stretch">
        {match && (
          <Button colorPalette="blue" size="lg" onClick={onStartDownload} disabled={!canDownload}>
            <Icon>
              <LuDownload />
            </Icon>
            {isBundle
              ? `Скачать набор (${bundleAnimes.length} аниме) ${torrent.sizeText ? `(${torrent.sizeText})` : ''}`
              : `Скачать и импортировать ${torrent.sizeText ? `(${torrent.sizeText})` : ''}`}
          </Button>
        )}
        {isBundle && bundleAnimes.length < 2 && (
          <Text fontSize="xs" color="orange.400" textAlign="center">
            Добавьте минимум 2 аниме для режима набора
          </Text>
        )}
        <HStack gap={2}>
          <Button colorPalette="green" variant="outline" size="lg" onClick={onCopyMagnet} flex={1}>
            <Icon>
              <LuCopy />
            </Icon>
            Скопировать магнет
          </Button>
          <Button variant="outline" onClick={onReset}>
            <Icon>
              <LuX />
            </Icon>
            Новый импорт
          </Button>
        </HStack>
      </VStack>
    </VStack>
  )
}

/** Карточка матчинга с Shikimori */
function ShikimoriMatchCard({
  match,
  shikimoriData,
  torrentExternalLinks,
  onMatchChange,
}: {
  match: RutrackerMatchResult | null
  shikimoriData?: ImportResult['shikimoriData']
  torrentExternalLinks?: TorrentInfo['externalLinks']
  onMatchChange: (newShikimoriId: number, newName: string, russian: string | null) => void
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Array<{ id: number; name: string; russian: string | null }>>([])
  const [searching, setSearching] = useState(false)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    searchTimerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const api = window.electronAPI
        const res = await api?.shikimori?.search({ search: query, limit: 10 })
        if (res?.success && res.data) {
          setSearchResults(
            res.data.map((a: { id: string; name: string; russian: string | null }) => ({
              id: Number(a.id),
              name: a.name,
              russian: a.russian,
            })),
          )
        }
      } finally {
        setSearching(false)
      }
    }, 400)
  }, [])

  const handlePick = useCallback(
    (id: number, name: string, russian: string | null) => {
      onMatchChange(id, name, russian)
      setSearchOpen(false)
      setSearchQuery('')
      setSearchResults([])
    },
    [onMatchChange],
  )

  const renderSearchPanel = () => (
    <VStack gap={2} align="stretch" mt={3} pt={3} borderTopWidth="1px" borderColor="border.subtle">
      <HStack gap={2}>
        <Input
          placeholder="Поиск аниме на Shikimori (например: Psycho-Pass)"
          value={searchQuery}
          onChange={(e) =>
            handleSearch(e.target.value)}
          size="sm"
          autoFocus
        />
        {searching && <Spinner size="sm" />}
        <Button
          size="sm"
          variant="ghost"
          onClick={() =>
            setSearchOpen(false)}
        >
          <Icon>
            <LuX />
          </Icon>
        </Button>
      </HStack>
      {searchResults.length > 0 && (
        <VStack gap={1} align="stretch" maxH="240px" overflowY="auto" borderWidth="1px" borderRadius="md" p={1}>
          {searchResults.map((r) => (
            <HStack
              key={r.id}
              gap={2}
              p={2}
              borderRadius="md"
              _hover={{ bg: 'bg.subtle' }}
              cursor="pointer"
              onClick={() => handlePick(r.id, r.name, r.russian)}
            >
              <VStack align="start" gap={0} flex={1}>
                <Text fontSize="sm">{r.russian ?? r.name}</Text>
                {r.russian && (
                  <Text fontSize="xs" color="fg.muted">
                    {r.name}
                  </Text>
                )}
              </VStack>
              <Badge size="sm" variant="subtle">
                #{r.id}
              </Badge>
              {match?.shikimoriId === r.id && (
                <Icon color="green.400" fontSize="xs">
                  <LuCheck />
                </Icon>
              )}
            </HStack>
          ))}
        </VStack>
      )}
    </VStack>
  )

  if (!match) {
    return (
      <Card.Root borderColor="orange.500" borderWidth="1px">
        <Card.Body>
          <HStack justify="space-between">
            <HStack>
              <Icon color="orange.500">
                <LuInfo />
              </Icon>
              <Text>Аниме не найдено на Shikimori. Найдите вручную:</Text>
            </HStack>
            {!searchOpen && (
              <Button
                size="sm"
                variant="outline"
                colorPalette="orange"
                onClick={() => setSearchOpen(true)}
              >
                <Icon>
                  <LuSearch />
                </Icon>
                Найти
              </Button>
            )}
          </HStack>
          {searchOpen && renderSearchPanel()}
        </Card.Body>
      </Card.Root>
    )
  }

  const confidenceColor = match.confidence >= 0.9 ? 'green' : match.confidence >= 0.7 ? 'yellow' : 'red'
  const confidenceLabel = match.confidence >= 0.9 ? 'Уверен' : match.confidence >= 0.7 ? 'Вероятно' : 'Сомнительно'

  return (
    <Card.Root borderColor={`${confidenceColor}.500`} borderWidth="1px">
      <Card.Body>
        <HStack justify="space-between" align="start">
          <VStack align="start" gap={1}>
            <HStack flexWrap="wrap">
              <Icon color={`${confidenceColor}.500`}>
                <LuCheck />
              </Icon>
              <Text
                fontWeight="bold"
                cursor="pointer"
                _hover={{ textDecoration: 'underline' }}
                onClick={() =>
                  window.electronAPI?.app?.openExternal(`https://shikimori.one/animes/${match.shikimoriId}`)}
              >
                Shikimori #{match.shikimoriId}
              </Text>
              <Badge colorPalette={confidenceColor}>
                {confidenceLabel} ({(match.confidence * 100).toFixed(0)}%)
              </Badge>
              {torrentExternalLinks?.malId && (
                <Text
                  fontSize="sm"
                  color="fg.muted"
                  cursor="pointer"
                  _hover={{ textDecoration: 'underline' }}
                  onClick={() =>
                    window.electronAPI?.app?.openExternal(
                      `https://myanimelist.net/anime/${torrentExternalLinks.malId}`,
                    )}
                >
                  mal-link
                </Text>
              )}
              <Badge variant="subtle">{match.method}</Badge>
            </HStack>
            <Text fontSize="sm" color="fg.muted">
              {match.details}
            </Text>
            {shikimoriData && (
              <HStack gap={2} mt={1}>
                <Text fontSize="sm">{shikimoriData.russian || shikimoriData.name}</Text>
                {shikimoriData.score && <Badge colorPalette="yellow">{shikimoriData.score}</Badge>}
              </HStack>
            )}
          </VStack>
          <VStack gap={2} align="end">
            {shikimoriData?.poster?.mainUrl && (
              <Image
                src={shikimoriData.poster.mainUrl.startsWith('http')
                  ? shikimoriData.poster.mainUrl
                  : `https://shikimori.one${shikimoriData.poster.mainUrl}`}
                alt="Shikimori poster"
                maxH="80px"
                borderRadius="md"
              />
            )}
            <Button size="xs" variant="outline" onClick={() => setSearchOpen((v) => !v)}>
              <Icon>
                <LuPencil />
              </Icon>
              {searchOpen ? 'Закрыть' : 'Изменить'}
            </Button>
          </VStack>
        </HStack>
        <AlreadyInLibraryBadge shikimoriId={match.shikimoriId} />
        {searchOpen && renderSearchPanel()}
      </Card.Body>
    </Card.Root>
  )
}

/** Карточка технической информации */
function TechnicalInfoCard({ torrent }: { torrent: TorrentInfo }) {
  const mi = torrent.mediaInfo
  return (
    <Card.Root flex={1} minW="300px">
      <Card.Header>
        <Heading size="sm">
          <HStack>
            <Icon>
              <LuFilm />
            </Icon>
            <Text>Техническая информация</Text>
          </HStack>
        </Heading>
      </Card.Header>
      <Card.Body>
        <VStack align="start" gap={1} fontSize="sm">
          {torrent.country && <InfoRow label="Страна" value={torrent.country} />}
          {torrent.studio && <InfoRow label="Студия" value={torrent.studio} />}
          {torrent.director && <InfoRow label="Режиссёр" value={torrent.director} />}
          {torrent.genres.length > 0 && <InfoRow label="Жанры" value={torrent.genres.join(', ')} />}
          {mi && (
            <>
              <InfoRow
                label="Видео"
                value={`${mi.videoCodec} ${mi.width}x${mi.height} ${mi.bitDepth}bit ${mi.fps}fps`}
              />
              <InfoRow label="Битрейт" value={`${mi.videoBitrate} kbps`} />
              {mi.audioTracks.map((at, i) => (
                <InfoRow
                  key={i}
                  label={`Аудио ${i + 1}`}
                  value={`${at.codec} ${at.channels} ${at.language} ${at.bitrate}kbps`}
                />
              ))}
            </>
          )}
          {torrent.description && (
            <Text mt={2} color="fg.muted" fontSize="xs" lineClamp={3}>
              {torrent.description}
            </Text>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

/** Карточка озвучек и субтитров */
function DubSubCard({ dubGroups }: { dubGroups: TorrentInfo['dubGroups'] }) {
  if (dubGroups.length === 0) {
    return null
  }

  const dubs = dubGroups.filter((g) => g.type === 'dub')
  const subs = dubGroups.filter((g) => g.type === 'sub')

  return (
    <Card.Root flex={1} minW="250px">
      <Card.Header>
        <Heading size="sm">
          <HStack>
            <Icon>
              <LuFileAudio />
            </Icon>
            <Text>Озвучки и субтитры</Text>
          </HStack>
        </Heading>
      </Card.Header>
      <Card.Body>
        <VStack align="start" gap={2}>
          {dubs.length > 0 && (
            <VStack align="start" gap={1}>
              <Text fontWeight="bold" fontSize="xs" color="fg.muted">
                Озвучка
              </Text>
              {dubs.map((d, i) => (
                <HStack key={i} gap={1}>
                  <Icon color="green.500" fontSize="xs">
                    <LuFileAudio />
                  </Icon>
                  <Text fontSize="sm">{d.name}</Text>
                  {d.isExternal && (
                    <Badge size="sm" variant="subtle">
                      ext
                    </Badge>
                  )}
                  {d.details && (
                    <Badge size="sm" variant="outline">
                      {d.details}
                    </Badge>
                  )}
                </HStack>
              ))}
            </VStack>
          )}
          {subs.length > 0 && (
            <VStack align="start" gap={1}>
              <Text fontWeight="bold" fontSize="xs" color="fg.muted">
                Субтитры
              </Text>
              {subs.map((s, i) => (
                <HStack key={i} gap={1}>
                  <Icon color="blue.500" fontSize="xs">
                    <LuCaptions />
                  </Icon>
                  <Text fontSize="sm">{s.name}</Text>
                  {s.details && (
                    <Badge size="sm" variant="outline">
                      {s.details}
                    </Badge>
                  )}
                </HStack>
              ))}
            </VStack>
          )}
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

/** Форматирование размера файла */
function formatSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** Форматирование скорости */
function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec < 1024) {
    return `${bytesPerSec} B/s`
  }
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
}

/** Шаг скачивания */
function DownloadingStep({
  progress,
  animeName,
  onCancel,
  onAddMore,
}: {
  progress: DownloadProgress
  animeName: string
  onCancel: () => void
  onAddMore: () => void
}) {
  const percent = Math.round(progress.progress * 100)

  return (
    <VStack gap={4} align="stretch">
      <Card.Root>
        <Card.Header>
          <Heading size="md">
            <HStack>
              <Icon>
                <LuDownload />
              </Icon>
              <Text>Скачивание: {animeName}</Text>
            </HStack>
          </Heading>
        </Card.Header>
        <Card.Body>
          <VStack gap={3} align="stretch">
            <Progress.Root value={percent} size="lg" colorPalette="blue">
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
            <HStack justify="space-between">
              <Text fontWeight="bold" fontSize="lg">
                {percent}%
              </Text>
              <Text fontSize="sm" color="fg.muted">
                {formatSize(progress.downloaded)} / {formatSize(progress.totalSize)}
              </Text>
            </HStack>
            <HStack gap={4} fontSize="sm" color="fg.muted">
              <Text>{formatSpeed(progress.downloadSpeed)}</Text>
              <Text>{progress.numPeers} пиров</Text>
              {progress.uploadSpeed > 0 && <Text>Отдача: {formatSpeed(progress.uploadSpeed)}</Text>}
            </HStack>
          </VStack>
        </Card.Body>
      </Card.Root>

      <HStack gap={2}>
        <Button colorPalette="blue" onClick={onAddMore} flex={1}>
          <Icon>
            <LuPlus />
          </Icon>
          Добавить ещё торрент
        </Button>
        <Button variant="outline" colorPalette="red" onClick={onCancel}>
          <Icon>
            <LuSquare />
          </Icon>
          Отменить скачивание
        </Button>
      </HStack>
    </VStack>
  )
}

/** Шаг завершения */
function DoneStep({ animeName, onReset }: { animeName: string; onReset: () => void }) {
  return (
    <Card.Root borderColor="green.500" borderWidth="1px">
      <Card.Body>
        <VStack gap={3}>
          <HStack>
            <Icon color="green.500" fontSize="xl">
              <LuCheck />
            </Icon>
            <Heading size="md">Скачивание завершено</Heading>
          </HStack>
          <Text>
            <strong>{animeName}</strong> скачан и добавлен в очередь импорта. Перейдите в <strong>Очередь</strong>{' '}
            для настройки транскодирования.
          </Text>
          <Button colorPalette="blue" onClick={onReset}>
            Импортировать ещё
          </Button>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

/** Шаг ошибки */
function ErrorStep({ error, onRetry }: { error: string | null; onRetry: () => void }) {
  return (
    <Card.Root borderColor="red.500" borderWidth="1px">
      <Card.Body>
        <VStack gap={3}>
          <HStack>
            <Icon color="red.500">
              <LuX />
            </Icon>
            <Text fontWeight="bold" color="red.500">
              Ошибка
            </Text>
          </HStack>
          <Text whiteSpace="pre-line" textAlign="center">
            {error || 'Неизвестная ошибка'}
          </Text>
          <Button onClick={onRetry} variant="outline">
            Попробовать снова
          </Button>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}

/** Строка информации */
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <HStack gap={2}>
      <Text color="fg.muted" minW="80px">
        {label}:
      </Text>
      <Text>{value}</Text>
    </HStack>
  )
}
