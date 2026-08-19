'use client'

import { Box, Button, CloseButton, Dialog, Flex, HStack, IconButton, Portal, Text, VStack } from '@chakra-ui/react'
import { useCallback, useRef, useState } from 'react'
import { LuMusic, LuTrash2, LuUpload } from 'react-icons/lu'
import type { CustomAudioTrack } from '../_schemas/viewer-settings.schema'

interface CustomAudioManagerProps {
  /** Диалог открыт */
  isOpen: boolean
  /** Закрыть диалог */
  onClose: () => void
  /** Список треков */
  tracks: CustomAudioTrack[]
  /** Добавить трек */
  onAddTrack: (file: File) => Promise<CustomAudioTrack>
  /** Удалить трек */
  onRemoveTrack: (id: string) => Promise<void>
  /** Выбрать трек */
  onSelectTrack: (id: string) => void
  /** ID текущего выбранного трека */
  selectedTrackId: string | null
}

/**
 * Форматирование размера файла
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} Б`
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} КБ`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`
}

/**
 * Форматирование длительности
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Компонент для управления кастомными аудио-треками
 */
export function CustomAudioManager({
  isOpen,
  onClose,
  tracks,
  onAddTrack,
  onRemoveTrack,
  onSelectTrack,
  selectedTrackId,
}: CustomAudioManagerProps) {
  const [uploadingCount, setUploadingCount] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isUploading = uploadingCount > 0

  /**
   * Обработка загрузки нескольких файлов
   */
  const handleFilesUpload = useCallback(
    async (files: File[]) => {
      setError(null)
      setUploadingCount(files.length)

      const errors: string[] = []

      for (const file of files) {
        try {
          await onAddTrack(file)
        } catch (err) {
          errors.push(`${file.name}: ${err instanceof Error ? err.message : 'Ошибка'}`)
        } finally {
          setUploadingCount((prev) => prev - 1)
        }
      }

      if (errors.length > 0) {
        setError(errors.join('\n'))
      }
    },
    [onAddTrack],
  )

  /**
   * Обработка выбора файлов через input
   */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFilesUpload(Array.from(files))
      }
      // Сбрасываем input для повторной загрузки тех же файлов
      e.target.value = ''
    },
    [handleFilesUpload],
  )

  /**
   * Обработка Drag & Drop
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const audioFiles = files.filter((file) => file.type.startsWith('audio/'))

      if (audioFiles.length === 0) {
        setError('Пожалуйста, выберите аудиофайлы')
        return
      }

      handleFilesUpload(audioFiles)
    },
    [handleFilesUpload],
  )

  /**
   * Удаление трека
   */
  const handleRemoveTrack = useCallback(
    async (id: string) => {
      try {
        await onRemoveTrack(id)
      } catch {
        setError('Не удалось удалить трек')
      }
    },
    [onRemoveTrack],
  )

  return (
    <Dialog.Root
      lazyMount
      open={isOpen}
      onOpenChange={(e) => {
        if (!e.open) {
          onClose()
        }
      }}
    >
      <Portal>
        <Dialog.Backdrop zIndex={10010} />
        <Dialog.Positioner zIndex={10010}>
          <Dialog.Content maxW="500px">
            <Dialog.Header>
              <Dialog.Title>Мои треки</Dialog.Title>
            </Dialog.Header>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>

            <Dialog.Body pb={6}>
              {/* Зона загрузки */}
              <Box
                border="2px dashed"
                borderColor={isDragging ? 'purple.400' : 'gray.600'}
                borderRadius="lg"
                p={6}
                textAlign="center"
                bg={isDragging ? 'purple.900/20' : 'transparent'}
                transitionProperty="border-color, background-color"
                transitionDuration="0.2s"
                cursor="pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />

                <VStack gap={2}>
                  <LuUpload size={32} color={isDragging ? '#9F7AEA' : '#A0AEC0'} />
                  <Text color="gray.400" fontSize="sm">
                    {isUploading ? `Загрузка... (${uploadingCount})` : 'Перетащите файлы или нажмите для выбора'}
                  </Text>
                  <Text color="gray.500" fontSize="xs">
                    MP3, WAV, OGG, M4A • до 100 МБ
                  </Text>
                </VStack>
              </Box>

              {/* Ошибка */}
              {error && (
                <Text color="red.400" fontSize="sm" mt={3}>
                  {error}
                </Text>
              )}

              {/* Список треков */}
              {tracks.length > 0 && (
                <VStack align="stretch" gap={2} mt={4}>
                  <Text color="gray.400" fontSize="sm" fontWeight="medium">
                    Загруженные треки ({tracks.length})
                  </Text>

                  {tracks.map((track) => (
                    <Flex
                      key={track.id}
                      align="center"
                      justify="space-between"
                      p={3}
                      bg={selectedTrackId === track.id ? 'purple.900/30' : 'gray.800'}
                      borderRadius="md"
                      borderWidth="1px"
                      borderColor={selectedTrackId === track.id ? 'purple.500' : 'transparent'}
                      cursor="pointer"
                      _hover={{ bg: 'gray.700' }}
                      onClick={() => onSelectTrack(track.id)}
                    >
                      <HStack gap={3}>
                        <Box color="purple.400">
                          <LuMusic size={20} />
                        </Box>
                        <Box>
                          <Text fontSize="sm" fontWeight="medium" lineClamp={1}>
                            {track.name}
                          </Text>
                          <Text color="gray.500" fontSize="xs">
                            {formatDuration(track.duration)} • {formatFileSize(track.size)}
                          </Text>
                        </Box>
                      </HStack>

                      <IconButton
                        aria-label="Удалить трек"
                        size="sm"
                        variant="ghost"
                        colorPalette="red"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveTrack(track.id)
                        }}
                      >
                        <LuTrash2 />
                      </IconButton>
                    </Flex>
                  ))}
                </VStack>
              )}

              {/* Пустое состояние */}
              {tracks.length === 0 && !isUploading && (
                <Text color="gray.500" fontSize="sm" textAlign="center" mt={4}>
                  Нет загруженных треков
                </Text>
              )}
            </Dialog.Body>

            <Dialog.Footer>
              <Button variant="outline" onClick={onClose}>
                Закрыть
              </Button>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
