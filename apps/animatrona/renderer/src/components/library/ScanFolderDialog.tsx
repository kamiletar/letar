'use client'

import {
  Badge,
  Box,
  Button,
  Checkbox,
  CloseButton,
  Dialog,
  HStack,
  Icon,
  Portal,
  Spinner,
  Table,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { LuFileVideo, LuFolderOpen, LuImport, LuRefreshCw } from 'react-icons/lu'

import { toaster } from '@/components/ui/toaster'

import { formatFileSize } from '@/lib/format-utils'
import { useCreateEpisode } from '@/lib/hooks'
import { type BaseScannedFile, useScanFolder } from '@/lib/hooks/use-scan-folder'
import { parseEpisodeNumber } from '@/lib/parse-filename'

interface ScanFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  animeId: string
  animeName: string
  existingEpisodeNumbers: number[]
}

/**
 * Диалог сканирования папки и импорта эпизодов
 */
export function ScanFolderDialog({
  open,
  onOpenChange,
  animeId,
  animeName,
  existingEpisodeNumbers,
}: ScanFolderDialogProps) {
  const queryClient = useQueryClient()
  const createEpisode = useCreateEpisode()

  const [folderPath, setFolderPath] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Мемоизируем опции для useScanFolder
  const scanOptions = useMemo(
    () => ({
      parseFile: (file: { name: string }) => ({
        episodeNumber: parseEpisodeNumber(file.name),
      }),
      getInitialSelection: (file: BaseScannedFile) =>
        file.episodeNumber !== null && !existingEpisodeNumbers.includes(file.episodeNumber),
    }),
    [existingEpisodeNumbers]
  )

  const { files, isScanning, scan, toggleFile, toggleAll, reset, selectedCount, totalWithNumbers } =
    useScanFolder(scanOptions)

  /** Выбрать папку */
  const handleSelectFolder = useCallback(async () => {
    if (!window.electronAPI) {
      console.error('electronAPI not available')
      return
    }

    const path = await window.electronAPI.dialog.selectFolder()
    if (path) {
      setFolderPath(path)
      // Автоматически сканируем после выбора
      await scan(path)
    }
  }, [scan])

  /** Импортировать выбранные эпизоды */
  const handleImport = useCallback(async () => {
    const selectedFiles = files.filter(
      (f): f is BaseScannedFile & { episodeNumber: number } => f.selected && f.episodeNumber !== null
    )
    if (selectedFiles.length === 0) {
      return
    }

    setIsImporting(true)
    const errors: Array<{ episode: number; error: string }> = []

    try {
      // Создаём эпизоды последовательно
      for (const file of selectedFiles) {
        try {
          await createEpisode.mutateAsync({
            data: {
              animeId,
              number: file.episodeNumber,
              name: null,
              durationMs: null,
              folderPath: file.path, // Путь к исходному файлу для импорта
            },
          })
        } catch (error) {
          // Собираем ошибки по каждому эпизоду
          errors.push({
            episode: file.episodeNumber,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      // Инвалидируем кэш
      await queryClient.invalidateQueries({ queryKey: ['animes'] })
      await queryClient.invalidateQueries({ queryKey: ['episodes'] })

      // Показываем результат
      const successCount = selectedFiles.length - errors.length
      if (errors.length === 0) {
        toaster.success({
          title: 'Эпизоды импортированы',
          description: `Добавлено ${successCount} эпизод(ов)`,
        })
        // Закрываем диалог и сбрасываем состояние
        onOpenChange(false)
        reset()
        setFolderPath(null)
      } else if (successCount > 0) {
        toaster.success({
          title: 'Частичный импорт',
          description: `Добавлено ${successCount} из ${selectedFiles.length}. Ошибки: ${errors
            .map((e) => `#${e.episode}`)
            .join(', ')}`,
        })
      } else {
        toaster.error({
          title: 'Ошибка импорта',
          description: `Не удалось добавить ${errors.length} эпизод(ов)`,
        })
      }
    } catch (error) {
      console.error('Ошибка импорта:', error)
      toaster.error({
        title: 'Ошибка импорта',
        description: error instanceof Error ? error.message : 'Не удалось импортировать эпизоды',
      })
    } finally {
      setIsImporting(false)
    }
  }, [files, animeId, createEpisode, queryClient, onOpenChange, reset])

  return (
    <Dialog.Root
      lazyMount
      open={open}
      onOpenChange={(e) => {
        onOpenChange(e.open)
        if (!e.open) {
          // Сбрасываем состояние при закрытии
          reset()
          setFolderPath(null)
        }
      }}
      size="xl"
      scrollBehavior="inside"
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.panel" borderColor="border.subtle" maxW="900px">
            <Dialog.Header borderBottomWidth="1px" borderColor="border.subtle">
              <Dialog.Title>Импорт эпизодов — {animeName}</Dialog.Title>
            </Dialog.Header>

            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>

            <Dialog.Body py={4}>
              <VStack gap={4} align="stretch">
                {/* Выбор папки */}
                <HStack gap={4}>
                  <Button variant="outline" onClick={handleSelectFolder} disabled={isScanning}>
                    <Icon as={LuFolderOpen} mr={2} />
                    Выбрать папку
                  </Button>
                  {folderPath && (
                    <>
                      <Text color="fg.muted" fontSize="sm" truncate flex={1}>
                        {folderPath}
                      </Text>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => folderPath && scan(folderPath)}
                        disabled={isScanning}
                      >
                        <Icon as={LuRefreshCw} />
                      </Button>
                    </>
                  )}
                </HStack>

                {/* Статус сканирования */}
                {isScanning && (
                  <HStack color="fg.muted">
                    <Spinner size="sm" />
                    <Text>Сканирование...</Text>
                  </HStack>
                )}

                {/* Список файлов */}
                {files.length > 0 && (
                  <Box>
                    <HStack justify="space-between" mb={2}>
                      <Text fontSize="sm" color="fg.subtle">
                        Найдено {files.length} видеофайлов, {totalWithNumbers} с распознанным номером
                      </Text>
                      <Button size="xs" variant="ghost" onClick={toggleAll}>
                        {files.every((f) => f.selected) ? 'Снять все' : 'Выбрать все'}
                      </Button>
                    </HStack>

                    <Box maxH="400px" overflowY="auto" borderWidth="1px" borderColor="border.subtle" borderRadius="md">
                      <Table.Root size="sm" variant="line">
                        <Table.Header>
                          <Table.Row bg="bg.subtle">
                            <Table.ColumnHeader w="40px" />
                            <Table.ColumnHeader w="60px">#</Table.ColumnHeader>
                            <Table.ColumnHeader>Файл</Table.ColumnHeader>
                            <Table.ColumnHeader w="80px">Размер</Table.ColumnHeader>
                          </Table.Row>
                        </Table.Header>
                        <Table.Body>
                          {files.map((file, index) => {
                            const isExisting =
                              file.episodeNumber !== null && existingEpisodeNumbers.includes(file.episodeNumber)

                            return (
                              <Table.Row
                                key={file.path}
                                opacity={file.episodeNumber === null ? 0.5 : 1}
                                _hover={{ bg: 'bg.subtle' }}
                              >
                                <Table.Cell>
                                  <Checkbox.Root
                                    checked={file.selected}
                                    onCheckedChange={() => toggleFile(index)}
                                    disabled={file.episodeNumber === null || isExisting}
                                  >
                                    <Checkbox.HiddenInput />
                                    <Checkbox.Control>
                                      <Checkbox.Indicator />
                                    </Checkbox.Control>
                                  </Checkbox.Root>
                                </Table.Cell>
                                <Table.Cell>
                                  {file.episodeNumber !== null ? (
                                    <HStack gap={1}>
                                      <Text fontWeight="medium">{file.episodeNumber}</Text>
                                      {isExisting && (
                                        <Badge size="sm" colorPalette="yellow">
                                          есть
                                        </Badge>
                                      )}
                                    </HStack>
                                  ) : (
                                    <Text color="fg.subtle">—</Text>
                                  )}
                                </Table.Cell>
                                <Table.Cell>
                                  <HStack gap={2}>
                                    <Icon as={LuFileVideo} color="purple.400" />
                                    <Text truncate maxW="400px" title={file.name}>
                                      {file.name}
                                    </Text>
                                  </HStack>
                                </Table.Cell>
                                <Table.Cell color="fg.muted">{formatFileSize(file.size)}</Table.Cell>
                              </Table.Row>
                            )
                          })}
                        </Table.Body>
                      </Table.Root>
                    </Box>
                  </Box>
                )}

                {/* Пустое состояние */}
                {!isScanning && files.length === 0 && folderPath && (
                  <Box textAlign="center" py={8}>
                    <Text color="fg.subtle">Видеофайлы не найдены в выбранной папке</Text>
                  </Box>
                )}

                {!folderPath && !isScanning && (
                  <Box textAlign="center" py={8}>
                    <Icon as={LuFolderOpen} boxSize={12} color="fg.subtle" mb={4} />
                    <Text color="fg.subtle">Выберите папку с эпизодами для сканирования</Text>
                  </Box>
                )}
              </VStack>
            </Dialog.Body>

            <Dialog.Footer borderTopWidth="1px" borderColor="border.subtle">
              <HStack justify="space-between" w="full">
                <Text fontSize="sm" color="fg.subtle">
                  {selectedCount > 0 && `Выбрано: ${selectedCount}`}
                </Text>
                <HStack gap={2}>
                  <Dialog.ActionTrigger asChild>
                    <Button variant="outline">Отмена</Button>
                  </Dialog.ActionTrigger>
                  <Button colorPalette="purple" onClick={handleImport} disabled={selectedCount === 0 || isImporting}>
                    {isImporting ? (
                      <>
                        <Spinner size="sm" mr={2} />
                        Импорт...
                      </>
                    ) : (
                      <>
                        <Icon as={LuImport} mr={2} />
                        Импортировать ({selectedCount})
                      </>
                    )}
                  </Button>
                </HStack>
              </HStack>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
