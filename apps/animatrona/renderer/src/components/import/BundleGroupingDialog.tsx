'use client'

/**
 * BundleGroupingDialog — разметка файлов в bundle-раздаче по Shikimori ID
 *
 * Флоу:
 * 1. Получает список файлов торрента через qBittorrent API
 * 2. Показывает две колонки: видеофайлы (по алфавиту) | аниме из bundleAnimesJson + поиск
 * 3. Автоматически матчит 1:1 по порядку — файл 1 → аниме 1
 * 4. Пользователь может поменять порядок аниме кнопками ↑/↓
 * 5. «В очередь» → последовательно открывает ImportWizardDialog для каждой группы
 */

import {
  Box,
  Button,
  CloseButton,
  Dialog,
  Heading,
  HStack,
  Icon,
  Portal,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import path from 'path'
import { useCallback, useEffect, useState } from 'react'
import { LuCheck, LuFilm, LuLayers, LuListPlus } from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'

import { type BundleAnimeEntry, BundleAnimesPanel } from './BundleAnimesPanel'
import { ImportWizardDialog } from './ImportWizardDialog'

/** Видеорасширения */
const VIDEO_EXTS = new Set(['.mkv', '.mp4', '.avi', '.webm', '.m4v', '.ts', '.m2ts'])

interface TorrentInfo {
  infoHash: string
  name: string
  path: string
  isBundle?: boolean
  bundleAnimesJson?: string
  shikimoriId?: number
}

interface PendingGroup {
  shikimoriId: number
  animeName: string
  filePath: string
  fileName: string
}

interface BundleGroupingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  torrent: TorrentInfo
  onDone: () => void
}

export function BundleGroupingDialog({ open, onOpenChange, torrent, onDone }: BundleGroupingDialogProps) {
  const [loading, setLoading] = useState(false)
  const [videoFiles, setVideoFiles] = useState<Array<{ name: string; absolutePath: string }>>([])
  const [animes, setAnimes] = useState<BundleAnimeEntry[]>([])
  const [pendingGroups, setPendingGroups] = useState<PendingGroup[]>([])
  const [currentGroupIdx, setCurrentGroupIdx] = useState<number | null>(null)
  const [importOpen, setImportOpen] = useState(false)
  const [importKey, setImportKey] = useState(0)

  // Загрузка файлов и парсинг bundleAnimesJson при открытии
  useEffect(() => {
    if (!open) {
      return
    }

    // Парсим аниме из мета
    try {
      const parsed: BundleAnimeEntry[] = torrent.bundleAnimesJson ? JSON.parse(torrent.bundleAnimesJson) : []
      setAnimes(parsed)
    } catch {
      setAnimes([])
    }

    // Загружаем файлы торрента
    setLoading(true)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const api = window.electronAPI as any
    if (!api?.torrent?.getFiles) {
      setLoading(false)
      return
    }

    api.torrent
      .getFiles(torrent.infoHash)
      .then((res: { success: boolean; data?: Array<{ name: string }> }) => {
        if (!res.success || !res.data) {
          return
        }
        const files = res.data
          .filter((f: { name: string }) => {
            const ext = f.name.slice(f.name.lastIndexOf('.')).toLowerCase()
            return VIDEO_EXTS.has(ext)
          })
          .sort((a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name))
          .map((f: { name: string }) => ({
            name: f.name.split(/[/\\]/).pop() ?? f.name,
            absolutePath: path.join(torrent.path, f.name),
          }))
        setVideoFiles(files)
      })
      .catch((err: unknown) => {
        console.error('[BundleGrouping] getFiles error:', err)
      })
      .finally(() => {
        setLoading(false)
      })
  }, [open, torrent.infoHash, torrent.path, torrent.bundleAnimesJson])

  // Запустить последовательный импорт
  const handleStartImport = useCallback(() => {
    if (videoFiles.length === 0) {
      toaster.error({ title: 'Видеофайлы не найдены' })
      return
    }
    if (animes.length < 2) {
      toaster.error({ title: 'Добавьте хотя бы 2 аниме в список набора' })
      return
    }

    const groups: PendingGroup[] = videoFiles.slice(0, animes.length).map((file, i) => ({
      shikimoriId: animes[i].shikimoriId,
      animeName: animes[i].animeName,
      filePath: file.absolutePath,
      fileName: file.name,
    }))

    setPendingGroups(groups)
    setCurrentGroupIdx(0)
    setImportKey((k) => k + 1)
    setImportOpen(true)
  }, [videoFiles, animes])

  // Переход к следующей группе после добавления в очередь
  const handleQueued = useCallback(() => {
    setCurrentGroupIdx((prev) => {
      if (prev === null) {
        return null
      }
      const next = prev + 1
      if (next >= pendingGroups.length) {
        // Все добавлены
        setImportOpen(false)
        onOpenChange(false)
        onDone()
        toaster.success({
          title: `Набор добавлен в очередь (${pendingGroups.length} аниме)`,
        })
        return null
      }
      // Следующая группа
      setImportKey((k) => k + 1)
      return next
    })
  }, [pendingGroups.length, onDone, onOpenChange])

  const currentGroup = currentGroupIdx !== null ? pendingGroups[currentGroupIdx] : null
  const mismatch = videoFiles.length !== animes.length

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(e) => onOpenChange(e.open)} size="xl">
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <HStack gap={2}>
                  <Icon>
                    <LuLayers />
                  </Icon>
                  <Dialog.Title>Разметка набора: {torrent.name}</Dialog.Title>
                </HStack>
                <CloseButton onClick={() => onOpenChange(false)} />
              </Dialog.Header>

              <Dialog.Body>
                {loading
                  ? (
                    <VStack gap={4} py={8}>
                      <Spinner />
                      <Text color="fg.muted">Загрузка файлов торрента...</Text>
                    </VStack>
                  )
                  : (
                    <VStack gap={4} align="stretch">
                      {/* Пояснение */}
                      <Text fontSize="sm" color="fg.muted">
                        Порядок аниме должен совпадать с порядком файлов. Каждый файл будет импортирован отдельно — сабы
                        сканер найдёт автоматически по имени файла.
                      </Text>

                      {mismatch && animes.length > 0 && (
                        <Box p={3} borderRadius="md" bg="orange.subtle" borderWidth="1px" borderColor="orange.200">
                          <Text fontSize="sm" color="orange.600">
                            Файлов: {videoFiles.length}, аниме: {animes.length}. {videoFiles.length > animes.length
                              ? `Последние ${videoFiles.length - animes.length} файлов будут пропущены.`
                              : `Последние ${animes.length - videoFiles.length} аниме не получат файлов.`}
                          </Text>
                        </Box>
                      )}

                      {/* Две колонки */}
                      <HStack gap={4} align="start">
                        {/* Файлы */}
                        <VStack align="stretch" flex={1} gap={2}>
                          <Heading size="sm">
                            <HStack gap={1}>
                              <Icon>
                                <LuFilm />
                              </Icon>
                              <Text>Видеофайлы ({videoFiles.length})</Text>
                            </HStack>
                          </Heading>
                          {videoFiles.length === 0 && (
                            <Text fontSize="sm" color="fg.muted">
                              Файлы не найдены
                            </Text>
                          )}
                          {videoFiles.map((f, i) => (
                            <Box
                              key={f.absolutePath}
                              p={2}
                              borderRadius="md"
                              bg={i < animes.length ? 'bg.subtle' : 'bg.error'}
                              borderWidth="1px"
                              borderColor={i < animes.length ? 'border.subtle' : 'red.200'}
                            >
                              <HStack gap={2}>
                                <Box
                                  px={2}
                                  py={0.5}
                                  borderRadius="sm"
                                  bg="bg.muted"
                                  fontSize="xs"
                                  fontWeight="bold"
                                  minW="24px"
                                  textAlign="center"
                                >
                                  {i + 1}
                                </Box>
                                <Text fontSize="xs" flex={1} truncate title={f.name}>
                                  {f.name}
                                </Text>
                              </HStack>
                            </Box>
                          ))}
                        </VStack>

                        {/* Аниме — переиспользуем BundleAnimesPanel с поиском */}
                        <Box flex={1}>
                          <BundleAnimesPanel
                            animes={animes}
                            onChange={setAnimes}
                            seedShikimoriId={torrent.shikimoriId}
                            flat
                            reorderable
                          />
                        </Box>
                      </HStack>
                    </VStack>
                  )}
              </Dialog.Body>

              <Dialog.Footer>
                <HStack gap={2} w="full" justify="flex-end">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Отмена
                  </Button>
                  <Button
                    colorPalette="blue"
                    onClick={handleStartImport}
                    disabled={loading || videoFiles.length === 0 || animes.length < 2}
                  >
                    <Icon>
                      <LuListPlus />
                    </Icon>
                    В очередь ({Math.min(videoFiles.length, animes.length)} аниме)
                  </Button>
                </HStack>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Последовательный импорт — по одному визарду на каждую группу */}
      {currentGroup && (
        <ImportWizardDialog
          key={importKey}
          open={importOpen}
          onOpenChange={(o) => {
            if (!o) {
              // Пользователь закрыл визард — прерываем импорт
              setImportOpen(false)
              setCurrentGroupIdx(null)
              setPendingGroups([])
            }
          }}
          preselectedShikimoriId={currentGroup.shikimoriId}
          preselectedName={currentGroup.animeName}
          initialData={{
            folderPath: torrent.path,
            videoFiles: [currentGroup.filePath],
            skipFolderSelect: true,
            isFileMode: true,
            singleFilePath: currentGroup.filePath,
          }}
          onQueued={handleQueued}
        />
      )}

      {/* Прогресс последовательного импорта */}
      {importOpen && currentGroupIdx !== null && pendingGroups.length > 0 && (
        <Box
          position="fixed"
          bottom={4}
          right={4}
          zIndex={9999}
          bg="bg.panel"
          borderRadius="md"
          borderWidth="1px"
          p={3}
          shadow="lg"
        >
          <HStack gap={2}>
            <Icon color="blue.400">
              <LuCheck />
            </Icon>
            <Text fontSize="sm">
              Импорт набора: {currentGroupIdx + 1} / {pendingGroups.length}
            </Text>
          </HStack>
          <Text fontSize="xs" color="fg.muted">
            {pendingGroups[currentGroupIdx]?.animeName}
          </Text>
        </Box>
      )}
    </>
  )
}
