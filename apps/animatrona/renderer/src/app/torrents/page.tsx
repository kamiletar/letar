// @ts-nocheck — torrent IPC типы ещё не добавлены в electron.d.ts
'use client'

/**
 * Страница управления торрентами
 *
 * Список активных торрентов, прогресс сидирования,
 * пауза/возобновление/удаление.
 */

import {
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Heading,
  HStack,
  Icon,
  Input,
  Portal,
  Progress,
  Skeleton,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuArrowDown,
  LuArrowUp,
  LuCheck,
  LuDownload,
  LuExternalLink,
  LuFolderOpen,
  LuLayers,
  LuListVideo,
  LuPause,
  LuPlay,
  LuRefreshCw,
  LuSearch,
  LuTrash,
  LuUsers,
  LuX,
} from 'react-icons/lu'

import { BundleGroupingDialog } from '@/components/import/BundleGroupingDialog'
import { ImportWizardDialog } from '@/components/import/ImportWizardDialog'
import { Header } from '@/components/layout'
import { toaster } from '@/components/ui/toaster'

export const dynamic = 'force-dynamic'

/** Информация о торренте (дублируем для renderer) */
interface TorrentInfo {
  infoHash: string
  name: string
  totalSize: number
  downloaded: number
  uploaded: number
  progress: number
  downloadSpeed: number
  uploadSpeed: number
  numPeers: number
  ratio?: number
  status: 'adding' | 'downloading' | 'checking' | 'seeding' | 'paused' | 'error' | 'done'
  path: string
  addedAt?: number
  importStatus?: 'none' | 'queued' | 'imported'
  animeName?: string
  shikimoriId?: number
  error?: string
  /** ID аниме в библиотеке (заполняется enrichWithLibraryStatus) */
  libraryAnimeId?: string
  /** Ссылка на страницу раздачи на Rutracker */
  rutrackerUrl?: string
  /** Набор из нескольких аниме */
  isBundle?: boolean
  /** JSON [{shikimoriId, animeName}] */
  bundleAnimesJson?: string
}

/** Форматирование размера */
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
  if (bytesPerSec === 0) {
    return '—'
  }
  if (bytesPerSec < 1024) {
    return `${Math.round(bytesPerSec)} B/s`
  }
  if (bytesPerSec < 1024 * 1024) {
    return `${(bytesPerSec / 1024).toFixed(1)} KB/s`
  }
  return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`
}

/** Цвет и текст статуса */
function getStatusInfo(status: TorrentInfo['status']): { color: string; label: string } {
  switch (status) {
    case 'adding':
      return { color: 'gray', label: 'Подключение' }
    case 'downloading':
      return { color: 'blue', label: 'Скачивание' }
    case 'checking':
      return { color: 'orange', label: 'Проверка...' }
    case 'seeding':
      return { color: 'green', label: 'Раздача' }
    case 'paused':
      return { color: 'yellow', label: 'Пауза' }
    case 'done':
      return { color: 'gray', label: 'Завершён' }
    case 'error':
      return { color: 'red', label: 'Ошибка' }
    default:
      return { color: 'gray', label: status }
  }
}

/** Русская плюрализация: pluralize(2, ['торрент', 'торрента', 'торрентов']) → 'торрента' */
function pluralize(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const lastDigit = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (lastDigit > 1 && lastDigit < 5) return forms[1]
  if (lastDigit === 1) return forms[0]
  return forms[2]
}

/** Контент страницы без Header — для встраивания в табы */
export function TorrentsContent() {
  const [torrents, setTorrents] = useState<TorrentInfo[]>([])
  /** Вкладка: торренты, которыми управляет Animatrona, или добавленные иначе (напрямую в qBittorrent) */
  const [torrentCategoryTab, setTorrentCategoryTab] = useState<'animatrona' | 'other'>('animatrona')
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const unsubRef = useRef<(() => void) | null>(null)

  // Состояние ImportWizardDialog
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importInitialData, setImportInitialData] = useState<
    | {
        folderPath: string
        videoFiles: string[]
        skipFolderSelect?: boolean
      }
    | undefined
  >()
  const [importShikimoriId, setImportShikimoriId] = useState<number | undefined>()
  const [importAnimeName, setImportAnimeName] = useState<string | undefined>()
  const [importSourceUrl, setImportSourceUrl] = useState<string | undefined>()
  const [importSourceTorrentCid, setImportSourceTorrentCid] = useState<string | undefined>()
  /** Аниме с тем же shikimoriId уже в библиотеке — реимпорт сольётся в него, а не создаст дубликат */
  const [importExistingAnimeId, setImportExistingAnimeId] = useState<string | undefined>()
  /** infoHash торрента, для которого открыт wizard (для обновления importStatus) */
  const [importingInfoHash, setImportingInfoHash] = useState<string | undefined>()
  /** Ключ для перемонтирования визарда — сбрасывает внутренний стейт */
  const [wizardKey, setWizardKey] = useState(0)
  /** Торренты, на которых выполняется действие (блокировка кнопок) */
  const [busyTorrents, setBusyTorrents] = useState<Set<string>>(new Set())
  /** Торрент, ожидающий подтверждения удаления с файлами */
  const [confirmDelete, setConfirmDelete] = useState<{ hash: string; name: string } | null>(null)
  /** Bundle dialog */
  const [bundleDialogOpen, setBundleDialogOpen] = useState(false)
  const [bundleTorrent, setBundleTorrent] = useState<TorrentInfo | null>(null)

  /** Проверить наличие аниме в библиотеке и обновить importStatus */
  const enrichWithLibraryStatus = useCallback(async (list: TorrentInfo[]): Promise<TorrentInfo[]> => {
    const api = window.electronAPI
    if (!api?.library?.checkAnimeExists) {
      return list
    }

    // Собираем все уникальные shikimoriId
    const idsToCheck = new Set<number>()
    for (const t of list) {
      if (t.shikimoriId) {
        idsToCheck.add(t.shikimoriId)
      }
    }

    if (idsToCheck.size === 0) {
      return list
    }

    // Проверяем все (параллельно, без кэша — торрентов мало, проверка быстрая)
    const libraryMap = new Map<number, { exists: boolean; animeId?: string }>()
    const checks = await Promise.all(
      [...idsToCheck].map(async (id) => {
        try {
          const res = await api.library.checkAnimeExists(id)
          return { id, exists: !!(res.success && res.data?.exists), animeId: res.data?.animeId as string | undefined }
        } catch {
          return { id, exists: false, animeId: undefined }
        }
      })
    )
    for (const { id, exists, animeId } of checks) {
      libraryMap.set(id, { exists, animeId })
    }

    // Обновляем importStatus: есть в библиотеке → 'imported', удалено → 'none'
    return list.map((t) => {
      if (!t.shikimoriId) {
        return t
      }
      const lib = libraryMap.get(t.shikimoriId)
      const inLibrary = lib?.exists ?? false
      if (inLibrary && t.importStatus !== 'imported') {
        return { ...t, importStatus: 'imported' as const, libraryAnimeId: lib?.animeId }
      }
      if (!inLibrary && t.importStatus === 'imported') {
        return { ...t, importStatus: 'none' as const, libraryAnimeId: undefined }
      }
      if (inLibrary && !t.libraryAnimeId) {
        return { ...t, libraryAnimeId: lib?.animeId }
      }
      return t
    })
  }, [])

  /** Загрузка списка торрентов */
  const fetchTorrents = useCallback(async () => {
    const api = window.electronAPI
    if (!api?.torrent) {
      return
    }

    const response = await api.torrent.getAll()
    if (response.success && response.data) {
      const enriched = await enrichWithLibraryStatus(response.data as TorrentInfo[])
      setTorrents(enriched)
    }
    setLoading(false)
  }, [enrichWithLibraryStatus])

  useEffect(() => {
    fetchTorrents()

    const api = window.electronAPI
    const unsubs: (() => void)[] = []

    if (api?.torrent) {
      // Обновление полных данных торрента (added, done)
      const handleFullUpdate = (info: unknown) => {
        setTorrents((prev) => {
          const t = info as TorrentInfo
          const idx = prev.findIndex((p) => p.infoHash === t.infoHash)
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = t
            return updated
          }
          return [...prev, t]
        })
      }

      // Обновление только прогресса (компактный формат, без files[] — снижает нагрузку на IPC)
      const handleProgress = (data: unknown) => {
        const p = data as {
          infoHash: string
          progress: number
          downloadSpeed: number
          uploadSpeed: number
          numPeers: number
          downloaded: number
          uploaded: number
          ratio: number
          status: string
        }
        setTorrents((prev) => {
          const idx = prev.findIndex((t) => t.infoHash === p.infoHash)
          if (idx < 0) return prev
          const existing = prev[idx]
          // Мержим только изменившиеся поля, не пересоздаём files[]
          if (
            existing.progress === p.progress &&
            existing.downloadSpeed === p.downloadSpeed &&
            existing.uploadSpeed === p.uploadSpeed &&
            existing.numPeers === p.numPeers &&
            existing.status === p.status
          ) {
            return prev // Ничего не изменилось — не обновляем стейт
          }
          const updated = [...prev]
          updated[idx] = { ...existing, ...p }
          return updated
        })
      }

      // Подписка на прогресс (компактный) и полные обновления
      unsubs.push(api.torrent.onProgress(handleProgress))
      unsubs.push(api.torrent.onAdded(handleFullUpdate))
      unsubs.push(api.torrent.onDone(handleFullUpdate))
    }

    // Опрос каждые 5 секунд (резервный, если progress-события не приходят)
    const interval = setInterval(fetchTorrents, 5000)

    return () => {
      for (const unsub of unsubs) unsub()
      clearInterval(interval)
    }
  }, [fetchTorrents])

  /** Обёртка для async действий — блокирует кнопки на время выполнения */
  const withBusy = useCallback(async (infoHash: string, fn: () => Promise<void>) => {
    setBusyTorrents((prev) => new Set(prev).add(infoHash))
    try {
      await fn()
    } finally {
      setBusyTorrents((prev) => {
        const next = new Set(prev)
        next.delete(infoHash)
        return next
      })
    }
  }, [])

  const handlePause = useCallback(
    async (infoHash: string) => {
      await withBusy(infoHash, async () => {
        const api = window.electronAPI
        if (!api?.torrent) return
        const res = await api.torrent.pause(infoHash)
        if (res.success) {
          setTorrents((prev) => prev.map((t) => (t.infoHash === infoHash ? { ...t, status: 'paused' as const } : t)))
        }
      })
    },
    [withBusy]
  )

  const handleResume = useCallback(
    async (infoHash: string) => {
      await withBusy(infoHash, async () => {
        const api = window.electronAPI
        if (!api?.torrent) return
        const res = await api.torrent.resume(infoHash)
        if (res.success) {
          setTorrents((prev) =>
            prev.map((t) =>
              t.infoHash === infoHash
                ? { ...t, status: t.progress >= 1 ? ('seeding' as const) : ('downloading' as const) }
                : t
            )
          )
        }
      })
    },
    [withBusy]
  )

  const handleRemove = useCallback(
    async (infoHash: string, name: string) => {
      await withBusy(infoHash, async () => {
        const api = window.electronAPI
        if (!api?.torrent) return
        const res = await api.torrent.remove(infoHash, false)
        if (res.success) {
          setTorrents((prev) => prev.filter((t) => t.infoHash !== infoHash))
          toaster.success({ title: `Торрент «${name}» удалён` })
        }
      })
    },
    [withBusy]
  )

  const handleRemoveWithFiles = useCallback(
    async (infoHash: string, name: string) => {
      await withBusy(infoHash, async () => {
        const api = window.electronAPI
        if (!api?.torrent) return
        const res = await api.torrent.remove(infoHash, true)
        if (res.success) {
          setTorrents((prev) => prev.filter((t) => t.infoHash !== infoHash))
          toaster.success({ title: `Торрент «${name}» удалён вместе с файлами` })
        }
      })
    },
    [withBusy]
  )

  /** Пересчитать хеш торрента (полная верификация, fire-and-forget) */
  const handleRecheck = useCallback(async (infoHash: string) => {
    try {
      const api = window.electronAPI
      console.log('[Torrents] handleRecheck вызван', {
        infoHash,
        hasApi: !!api,
        hasTorrent: !!api?.torrent,
        hasRecheck: typeof api?.torrent?.recheck,
      })
      if (!api?.torrent) {
        toaster.error({ title: 'API торрентов недоступен' })
        return
      }
      if (typeof api.torrent.recheck !== 'function') {
        toaster.error({
          title: 'Метод recheck не найден в API',
          description: 'Возможно, нужно перезапустить приложение',
        })
        return
      }
      const res = await api.torrent.recheck(infoHash)
      console.log('[Torrents] recheck результат', res)
      if (!res.success) {
        toaster.error({ title: 'Ошибка запуска верификации', description: res.error })
      }
    } catch (err) {
      console.error('[Torrents] handleRecheck ошибка', err)
      toaster.error({ title: 'Ошибка recheck', description: String(err) })
    }
    // Прогресс приходит через broadcastProgress → onProgress/onAdded
  }, [])

  /** Сбросить статус импорта торрента (чтобы заново открыть визард) */
  const handleResetImportStatus = useCallback(async (infoHash: string) => {
    const api = window.electronAPI
    if (!api?.torrent) return
    await api.torrent.updateMeta(infoHash, { importStatus: 'none' })
    setTorrents((prev) => prev.map((t) => (t.infoHash === infoHash ? { ...t, importStatus: 'none' as const } : t)))
    toaster.success({ title: 'Статус импорта сброшен' })
  }, [])

  /** Открыть BundleGroupingDialog для торрента без isBundle флага */
  const handleOpenAsBundle = useCallback(
    (infoHash: string) => {
      const torrent = torrents.find((t) => t.infoHash === infoHash)
      if (!torrent) return
      // Помечаем как bundle в мете и открываем диалог
      window.electronAPI?.torrent?.updateMeta(infoHash, { isBundle: true })
      setTorrents((prev) => prev.map((t) => (t.infoHash === infoHash ? { ...t, isBundle: true } : t)))
      setBundleTorrent({ ...torrent, isBundle: true })
      setBundleDialogOpen(true)
    },
    [torrents]
  )

  /**
   * Найти источник для торрента без rutrackerUrl — по ссылке в comment раздачи qBittorrent.
   * Для торрентов, добавленных вручную (не через Animatrona). Без повторного скачивания.
   */
  const handleFindSource = useCallback(
    async (infoHash: string) => {
      await withBusy(infoHash, async () => {
        const api = window.electronAPI
        if (!api?.rutracker?.findSourceForTorrent) {
          toaster.error({ title: 'API поиска источника недоступен' })
          return
        }
        const res = await api.rutracker.findSourceForTorrent(infoHash)
        if (!res.success || !res.data) {
          toaster.error({ title: 'Ошибка поиска источника', description: res.error })
          return
        }
        if (!res.data.found) {
          toaster.info({
            title: 'Ссылка не найдена',
            description: 'В комментарии раздачи нет ссылки на страницу Rutracker',
          })
          return
        }
        if (res.data.linked) {
          toaster.success({
            title: `Источник найден: ${res.data.animeName ?? ''}`,
            description: 'Торрент связан с раздачей Rutracker',
          })
          setTorrents((prev) =>
            prev.map((t) =>
              t.infoHash === infoHash
                ? { ...t, rutrackerUrl: res.data.url, shikimoriId: res.data.shikimoriId, animeName: res.data.animeName }
                : t
            )
          )
        } else {
          toaster.info({
            title: 'Ссылка найдена, но матч неуверенный',
            description: 'Откройте страницу и подтвердите аниме вручную во вкладке Rutracker',
          })
          window.electronAPI?.app?.openExternal(res.data.url)
        }
      })
    },
    [withBusy]
  )

  /** Открыть ImportWizard для файлов торрента */
  const handleImport = useCallback(
    async (infoHash: string) => {
      try {
        const api = window.electronAPI
        const torrent = torrents.find((t) => t.infoHash === infoHash)
        if (!torrent || !api) {
          toaster.error({ title: 'Торрент не найден' })
          return
        }

        // Bundle: открываем диалог разметки файлов
        if (torrent.isBundle) {
          setBundleTorrent(torrent)
          setBundleDialogOpen(true)
          return
        }

        // Определяем путь к папке торрента
        const videoExts = ['.mkv', '.mp4', '.avi', '.webm', '.m4v', '.ts']
        const isSingleFile = videoExts.some((ext) => torrent.name.toLowerCase().endsWith(ext))
        let folderPath = torrent.path ? (isSingleFile ? torrent.path : `${torrent.path}/${torrent.name}`) : null
        // Фоллбэк на мету торрента (уже есть, если источник найден через «Найти источник»
        // или торрент добавлен через оркестратор в прошлой сессии) — переопределяется ниже,
        // если оркестратор вернёт более полные данные (например folderPath).
        let shikimoriId: number | undefined = torrent.shikimoriId
        let animeName: string | undefined = torrent.animeName
        let rutrackerUrl: string | undefined = torrent.rutrackerUrl
        let sourceTorrentCid: string | undefined

        // Пытаемся получить метаданные из оркестратора (shikimoriId, animeName, rutrackerUrl)
        if (api.rutracker) {
          try {
            const meta = await api.rutracker.getDownloadMeta(infoHash)
            if (meta.success && meta.data) {
              shikimoriId = meta.data.shikimoriId
              animeName = meta.data.animeName
              rutrackerUrl = meta.data.rutrackerUrl
              sourceTorrentCid = meta.data.torrentFileCid
              if (meta.data.folderPath) {
                folderPath = meta.data.folderPath
              }
            }
          } catch (err) {
            console.warn('[Torrents] getDownloadMeta failed:', err)
          }
        }

        if (!folderPath) {
          toaster.error({ title: 'Не удалось определить папку торрента' })
          return
        }

        // Для одиночного файла — используем его напрямую, для папки — сканируем
        let videoFiles: string[] = []
        if (isSingleFile) {
          videoFiles = [`${torrent.path}/${torrent.name}`]
        } else if (api.fs) {
          const scanResult = await api.fs.scanFolder(folderPath, false)
          if (scanResult.success && scanResult.data?.files) {
            videoFiles = scanResult.data.files.map((f: { path: string }) => f.path)
          }
        }

        if (videoFiles.length === 0) {
          toaster.warning({ title: 'Видеофайлы не найдены', description: `Папка: ${folderPath}` })
          return
        }

        // Тот же shikimoriId уже в библиотеке? Реимпорт (перезалив) должен слиться в ту же
        // карточку, а не создать дубликат. При расхождении числа серий — подтверждение,
        // раз это может означать другой релиз/качество, а не 1:1 копию старого.
        let existingAnimeId: string | undefined
        if (shikimoriId && api.library) {
          try {
            const existsRes = await api.library.checkAnimeExists(shikimoriId)
            if (existsRes.success && existsRes.data?.exists && existsRes.data.animeId) {
              const existingEpisodeCount = existsRes.data.episodeCount ?? 0
              if (existingEpisodeCount > 0 && existingEpisodeCount !== videoFiles.length) {
                const proceed = window.confirm(
                  `«${existsRes.data.animeName}» уже в библиотеке с ${existingEpisodeCount} серия(ями), ` +
                    `а в этой раздаче ${videoFiles.length}. Возможно это другой релиз/качество. ` +
                    `Всё равно слить в существующую карточку?`
                )
                if (!proceed) {
                  return
                }
              }
              existingAnimeId = existsRes.data.animeId
            }
          } catch (err) {
            console.warn('[Torrents] checkAnimeExists failed:', err)
          }
        }

        setImportInitialData({
          folderPath,
          videoFiles,
          skipFolderSelect: true,
          ...(isSingleFile && { isFileMode: true, singleFilePath: videoFiles[0] }),
        })
        setImportShikimoriId(shikimoriId)
        setImportAnimeName(animeName ?? torrent.name)
        setImportSourceUrl(rutrackerUrl)
        setImportSourceTorrentCid(sourceTorrentCid)
        setImportExistingAnimeId(existingAnimeId)
        setImportingInfoHash(infoHash)
        setWizardKey((k) => k + 1)
        setImportDialogOpen(true)
      } catch (err) {
        console.error('[Torrents] handleImport error:', err)
        toaster.error({ title: 'Ошибка открытия импорта', description: String(err) })
      }
    },
    [torrents]
  )

  return (
    <Box p={4} maxW="900px" mx="auto">
      {loading ? (
        <VStack gap={3} align="stretch">
          <Skeleton height="140px" borderRadius="md" />
          <Skeleton height="140px" borderRadius="md" />
        </VStack>
      ) : torrents.length === 0 ? (
        <Card.Root>
          <Card.Body>
            <VStack gap={3} py={8}>
              <Icon fontSize="3xl" color="fg.muted">
                <LuDownload />
              </Icon>
              <Heading size="md" color="fg.muted">
                Нет активных торрентов
              </Heading>
              <Text color="fg.muted" fontSize="sm">
                Торренты появятся здесь после начала скачивания из Rutracker
              </Text>
            </VStack>
          </Card.Body>
        </Card.Root>
      ) : (
        <VStack gap={3} align="stretch">
          {(() => {
            const isManaged = (t: TorrentInfo) => t.category === 'animatrona'
            const managedCount = torrents.filter(isManaged).length
            const otherCount = torrents.length - managedCount
            return (
              <HStack gap={2}>
                <Button
                  size="xs"
                  variant={torrentCategoryTab === 'animatrona' ? 'solid' : 'ghost'}
                  onClick={() => setTorrentCategoryTab('animatrona')}
                >
                  Animatrona ({managedCount})
                </Button>
                <Button
                  size="xs"
                  variant={torrentCategoryTab === 'other' ? 'solid' : 'ghost'}
                  onClick={() => setTorrentCategoryTab('other')}
                >
                  Остальное ({otherCount})
                </Button>
              </HStack>
            )
          })()}
          <HStack position="relative">
            <Icon position="absolute" left={3} color="fg.muted" zIndex={1} pointerEvents="none">
              <LuSearch />
            </Icon>
            <Input
              pl={9}
              placeholder="Поиск по названию..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              size="sm"
            />
          </HStack>
          <HStack justify="space-between">
            <Text color="fg.muted" fontSize="sm">
              {torrents.length} {pluralize(torrents.length, ['торрент', 'торрента', 'торрентов'])}
            </Text>
            <TotalStats torrents={torrents} />
          </HStack>
          {torrents
            .filter((t) =>
              torrentCategoryTab === 'animatrona' ? t.category === 'animatrona' : t.category !== 'animatrona'
            )
            .filter((t) => {
              if (!searchQuery) return true
              const q = searchQuery.toLowerCase()
              return t.name.toLowerCase().includes(q) || (t.animeName?.toLowerCase().includes(q) ?? false)
            })
            .map((torrent) => (
              <TorrentCard
                key={torrent.infoHash}
                torrent={torrent}
                busy={busyTorrents.has(torrent.infoHash)}
                onPause={handlePause}
                onResume={handleResume}
                onRemove={handleRemove}
                onRemoveWithFiles={(hash, name) => setConfirmDelete({ hash, name })}
                onImport={handleImport}
                onOpenAsBundle={handleOpenAsBundle}
                onResetImportStatus={handleResetImportStatus}
                onRecheck={handleRecheck}
                onFindSource={handleFindSource}
              />
            ))}
        </VStack>
      )}

      {/* Визард импорта для кнопки «В очередь» */}
      <ImportWizardDialog
        key={wizardKey}
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open)
          if (!open) {
            // Сбрасываем данные предыдущего импорта
            setImportInitialData(undefined)
            setImportShikimoriId(undefined)
            setImportAnimeName(undefined)
            setImportSourceUrl(undefined)
            setImportSourceTorrentCid(undefined)
            setImportExistingAnimeId(undefined)
            setImportingInfoHash(null)
          }
        }}
        initialData={importInitialData}
        preselectedShikimoriId={importShikimoriId}
        preselectedName={importAnimeName}
        sourceUrl={importSourceUrl}
        sourceTorrentCid={importSourceTorrentCid}
        existingAnimeId={importExistingAnimeId}
        onQueued={() => {
          // Обновляем importStatus торрента в DB
          if (importingInfoHash) {
            window.electronAPI?.torrent?.updateMeta(importingInfoHash, { importStatus: 'queued' })
            // Обновляем локальный стейт
            setTorrents((prev) =>
              prev.map((t) => (t.infoHash === importingInfoHash ? { ...t, importStatus: 'queued' } : t))
            )
          }
        }}
      />

      {/* Bundle: диалог разметки файлов по аниме */}
      {bundleTorrent && (
        <BundleGroupingDialog
          open={bundleDialogOpen}
          onOpenChange={(open) => {
            setBundleDialogOpen(open)
            if (!open) setBundleTorrent(null)
          }}
          torrent={bundleTorrent}
          onDone={() => {
            setBundleDialogOpen(false)
            setBundleTorrent(null)
            if (bundleTorrent) {
              window.electronAPI?.torrent?.updateMeta(bundleTorrent.infoHash, { importStatus: 'queued' })
              setTorrents((prev) =>
                prev.map((t) => (t.infoHash === bundleTorrent.infoHash ? { ...t, importStatus: 'queued' } : t))
              )
            }
          }}
        />
      )}

      {/* Диалог подтверждения удаления с файлами */}
      <Dialog.Root
        open={!!confirmDelete}
        onOpenChange={(e) => {
          if (!e.open) setConfirmDelete(null)
        }}
      >
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Удалить с файлами?</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>
                <Text>Файлы торрента «{confirmDelete?.name}» будут безвозвратно удалены с диска. Продолжить?</Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                  Отмена
                </Button>
                <Button
                  colorPalette="red"
                  onClick={() => {
                    if (confirmDelete) {
                      handleRemoveWithFiles(confirmDelete.hash, confirmDelete.name)
                      setConfirmDelete(null)
                    }
                  }}
                >
                  Удалить
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}

/** Страница-обёртка для прямого роутинга */
export default function TorrentsPage() {
  return (
    <Box>
      <Header title="Торренты" />
      <TorrentsContent />
    </Box>
  )
}

/** Суммарная статистика */
function TotalStats({ torrents }: { torrents: TorrentInfo[] }) {
  const totalDown = torrents.reduce((s, t) => s + t.downloadSpeed, 0)
  const totalUp = torrents.reduce((s, t) => s + t.uploadSpeed, 0)

  if (totalDown === 0 && totalUp === 0) {
    return null
  }

  return (
    <HStack gap={3} fontSize="sm" color="fg.muted">
      {totalDown > 0 && (
        <HStack gap={1}>
          <Icon color="blue.500">
            <LuArrowDown />
          </Icon>
          <Text>{formatSpeed(totalDown)}</Text>
        </HStack>
      )}
      {totalUp > 0 && (
        <HStack gap={1}>
          <Icon color="green.500">
            <LuArrowUp />
          </Icon>
          <Text>{formatSpeed(totalUp)}</Text>
        </HStack>
      )}
    </HStack>
  )
}

/** Карточка торрента */
function TorrentCard({
  torrent,
  busy,
  onPause,
  onResume,
  onRemove,
  onRemoveWithFiles,
  onImport,
  onOpenAsBundle,
  onResetImportStatus,
  onRecheck,
  onFindSource,
}: {
  torrent: TorrentInfo
  busy: boolean
  onPause: (hash: string) => void
  onResume: (hash: string) => void
  onRemove: (hash: string, name: string) => void
  onRemoveWithFiles: (hash: string, name: string) => void
  onImport: (hash: string) => void
  onOpenAsBundle: (hash: string) => void
  onResetImportStatus: (hash: string) => void
  onRecheck: (hash: string) => void
  onFindSource: (hash: string) => void
  onOpenRutracker?: (url: string) => void
}) {
  const { color, label } = getStatusInfo(torrent.status)
  // Не показывать 100% при downloading — может быть округление 99.9%
  const rawPercent = torrent.progress * 100
  const percent = torrent.status === 'downloading' ? Math.min(Math.round(rawPercent), 99) : Math.round(rawPercent)
  const ratio = torrent.ratio ?? (torrent.downloaded > 0 ? torrent.uploaded / torrent.downloaded : 0)
  const isSeeding = torrent.status === 'seeding'
  const isDone = torrent.status === 'done'
  const isChecking = torrent.status === 'checking'
  const isPaused = torrent.status === 'paused'
  const isDownloading = torrent.status === 'downloading'
  const isFullyDownloaded = (torrent.progress ?? 0) >= 1
  const canImport =
    (isSeeding || isDone || isPaused || isFullyDownloaded) &&
    torrent.importStatus !== 'queued' &&
    torrent.importStatus !== 'imported'

  // Постер из Shikimori (если есть shikimoriId)
  const posterUrl = torrent.shikimoriId
    ? `https://shikimori.one/system/animes/original/${torrent.shikimoriId}.jpg`
    : undefined

  return (
    <Card.Root>
      <Card.Body>
        <VStack gap={3} align="stretch">
          {/* Заголовок + постер + статус */}
          <HStack justify="space-between" align="start" gap={3}>
            {posterUrl && (
              <Box
                as="img"
                src={posterUrl}
                alt={torrent.animeName ?? torrent.name}
                w="48px"
                h="68px"
                borderRadius="sm"
                objectFit="cover"
                flexShrink={0}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
            )}
            <VStack align="start" gap={0} flex={1} minW={0}>
              {torrent.animeName && (
                <Text fontWeight="bold" fontSize="sm" lineClamp={1}>
                  {torrent.animeName}
                </Text>
              )}
              <Text
                fontSize="xs"
                color={torrent.animeName ? 'fg.muted' : 'fg'}
                fontWeight={torrent.animeName ? 'normal' : 'bold'}
                lineClamp={1}
              >
                {torrent.name}
              </Text>
              <Text fontSize="xs" color="fg.muted">
                {formatSize(torrent.totalSize)}
              </Text>
            </VStack>
            <HStack gap={2} flexShrink={0}>
              {torrent.importStatus === 'queued' && (
                <Badge
                  colorPalette="purple"
                  variant="subtle"
                  cursor="pointer"
                  onClick={() => onResetImportStatus(torrent.infoHash)}
                  title="Сбросить статус импорта"
                >
                  <Icon>
                    <LuListVideo />
                  </Icon>
                  В очереди
                  <Icon fontSize="xs">
                    <LuX />
                  </Icon>
                </Badge>
              )}
              {torrent.importStatus === 'imported' && (
                <Badge
                  colorPalette="green"
                  variant="subtle"
                  cursor={torrent.libraryAnimeId ? 'pointer' : undefined}
                  onClick={() => {
                    if (torrent.libraryAnimeId) {
                      window.location.href = `/library/${torrent.libraryAnimeId}`
                    }
                  }}
                  title={torrent.libraryAnimeId ? 'Открыть в библиотеке' : undefined}
                >
                  <Icon>
                    <LuCheck />
                  </Icon>
                  В библиотеке
                </Badge>
              )}
              <Badge colorPalette={color}>{label}</Badge>
            </HStack>
          </HStack>

          {/* Текст ошибки */}
          {torrent.status === 'error' && torrent.error && (
            <Text fontSize="xs" color="red.500">
              {torrent.error}
            </Text>
          )}

          {/* Прогресс — скрыт при done/paused с 100% (кроме checking) */}
          {!(isDone || (isPaused && isFullyDownloaded)) && (
            <Progress.Root
              value={torrent.status === 'adding' ? null : percent}
              size="sm"
              colorPalette={torrent.status === 'error' ? 'red' : isChecking ? 'orange' : isSeeding ? 'green' : 'blue'}
              aria-label={isChecking ? `Проверка: ${percent}%` : `Прогресс: ${percent}%`}
            >
              <Progress.Track>
                <Progress.Range />
              </Progress.Track>
            </Progress.Root>
          )}

          {/* Метрики */}
          <HStack justify="space-between" fontSize="xs" color="fg.muted" flexWrap="wrap" gap={2}>
            <HStack gap={3}>
              {isDownloading && (
                <HStack gap={1}>
                  <Icon color="blue.500">
                    <LuArrowDown />
                  </Icon>
                  <Text>{formatSpeed(torrent.downloadSpeed)}</Text>
                </HStack>
              )}
              {(isSeeding || torrent.uploadSpeed > 0) && (
                <HStack gap={1}>
                  <Icon color="green.500">
                    <LuArrowUp />
                  </Icon>
                  <Text>{formatSpeed(torrent.uploadSpeed)}</Text>
                </HStack>
              )}
              <HStack gap={1}>
                <Icon>
                  <LuUsers />
                </Icon>
                <Text>{torrent.numPeers}</Text>
              </HStack>
            </HStack>
            <HStack gap={3}>
              {isChecking && <Text color="orange.400">Проверка {percent}%</Text>}
              {isDownloading && <Text>{percent}%</Text>}
              {(isSeeding || isDone || torrent.uploaded > 0) && <Text>Ratio: {ratio.toFixed(2)}</Text>}
              {(isSeeding || torrent.status === 'done') && (
                <HStack gap={1}>
                  <Icon color="green.500">
                    <LuCheck />
                  </Icon>
                  <Text>Отдано: {formatSize(torrent.uploaded)}</Text>
                </HStack>
              )}
            </HStack>
          </HStack>

          {/* Действия */}
          <HStack gap={2} justify="end">
            {torrent.rutrackerUrl && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => window.electronAPI?.app?.openExternal(torrent.rutrackerUrl!)}
                title="Открыть раздачу на Rutracker"
              >
                <Icon>
                  <LuExternalLink />
                </Icon>
              </Button>
            )}
            {!torrent.rutrackerUrl && (
              <Button
                size="xs"
                variant="ghost"
                disabled={busy}
                onClick={() => onFindSource(torrent.infoHash)}
                title="Найти источник по ссылке в комментарии раздачи"
              >
                <Icon>
                  <LuSearch />
                </Icon>
                Найти источник
              </Button>
            )}
            {torrent.path && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  // Открываем папку конкретного торрента, а не корневую директорию
                  const folderPath = `${torrent.path}\\${torrent.name}`
                  window.electronAPI?.app?.showInFolder(folderPath)
                }}
                title={`Открыть папку: ${torrent.path}\\${torrent.name}`}
              >
                <Icon>
                  <LuFolderOpen />
                </Icon>
              </Button>
            )}
            {canImport && (
              <Button
                size="xs"
                variant="solid"
                colorPalette="purple"
                disabled={busy}
                onClick={() => onImport(torrent.infoHash)}
              >
                <Icon>
                  <LuListVideo />
                </Icon>
                {torrent.isBundle ? 'В очередь (набор)' : 'В очередь'}
              </Button>
            )}
            {canImport && !torrent.isBundle && (
              <Button
                size="xs"
                variant="outline"
                colorPalette="blue"
                disabled={busy}
                onClick={() => onOpenAsBundle(torrent.infoHash)}
                title="Импортировать как набор из нескольких аниме"
              >
                <Icon>
                  <LuLayers />
                </Icon>
                Набор
              </Button>
            )}
            {(isDownloading || isSeeding) && (
              <Button size="xs" variant="outline" disabled={busy} onClick={() => onPause(torrent.infoHash)}>
                <Icon>
                  <LuPause />
                </Icon>
                Пауза
              </Button>
            )}
            {isPaused && (
              <Button
                size="xs"
                variant="outline"
                colorPalette="green"
                disabled={busy}
                onClick={() => onResume(torrent.infoHash)}
              >
                <Icon>
                  <LuPlay />
                </Icon>
                Продолжить
              </Button>
            )}
            {!isChecking && (isPaused || isSeeding || isDone || torrent.status === 'error') && (
              <Button
                size="xs"
                variant="outline"
                disabled={busy}
                onClick={() => onRecheck(torrent.infoHash)}
                title="Пересчитать хеш — полная верификация всех кусков"
              >
                <Icon>
                  <LuRefreshCw />
                </Icon>
                Пересчитать хеш
              </Button>
            )}
            <Button
              size="xs"
              variant="outline"
              disabled={busy}
              onClick={() => onRemove(torrent.infoHash, torrent.name)}
            >
              <Icon>
                <LuX />
              </Icon>
              Убрать из списка
            </Button>
            <Button
              size="xs"
              variant="outline"
              colorPalette="red"
              disabled={busy}
              onClick={() => onRemoveWithFiles(torrent.infoHash, torrent.name)}
            >
              <Icon>
                <LuTrash />
              </Icon>
              Удалить с файлами
            </Button>
          </HStack>
        </VStack>
      </Card.Body>
    </Card.Root>
  )
}
