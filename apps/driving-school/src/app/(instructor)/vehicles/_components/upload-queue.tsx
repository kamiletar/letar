'use client'

/**
 * Очередь файлов для загрузки
 */

import { Box, Button, HStack, IconButton, Progress, Text, VStack } from '@chakra-ui/react'
import { LuTrash2 } from 'react-icons/lu'

import type { UploadedFile } from './vehicle-photos.types'

interface UploadQueueProps {
  /** Файлы в очереди */
  queue: UploadedFile[]
  /** Количество файлов в ожидании */
  pendingCount: number
  /** Количество файлов в процессе загрузки */
  uploadingCount: number
  /** Обработчик загрузки всех файлов */
  onUploadAll: () => void
  /** Обработчик удаления файла из очереди */
  onRemove: (fileItem: UploadedFile) => void
}

/**
 * Список файлов в очереди загрузки
 */
export function UploadQueue({ queue, pendingCount, uploadingCount, onUploadAll, onRemove }: UploadQueueProps) {
  if (queue.length === 0) {
    return null
  }

  return (
    <VStack gap={2} align="stretch">
      <HStack justify="space-between">
        <Text fontSize="sm">
          Файлов: {queue.length} (ожидает: {pendingCount})
        </Text>
        {pendingCount > 0 && (
          <Button size="xs" colorPalette="brand" onClick={onUploadAll} loading={uploadingCount > 0}>
            Загрузить все
          </Button>
        )}
      </HStack>

      {queue.map((fileItem) => (
        <UploadQueueItem key={fileItem.file.name} fileItem={fileItem} onRemove={() => onRemove(fileItem)} />
      ))}
    </VStack>
  )
}

interface UploadQueueItemProps {
  fileItem: UploadedFile
  onRemove: () => void
}

/**
 * Элемент очереди загрузки
 */
function UploadQueueItem({ fileItem, onRemove }: UploadQueueItemProps) {
  return (
    <HStack gap={3} p={2} borderWidth="1px" borderRadius="md">
      {/* Превью */}
      <Box width="50px" height="50px" borderRadius="md" overflow="hidden" flexShrink={0}>
        {/* oxlint-disable-next-line eslint-plugin-next(no-img-element) -- data URL preview */}
        <img
          src={fileItem.preview}
          alt={fileItem.file.name}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      </Box>

      {/* Информация */}
      <Box flex="1">
        <Text fontSize="xs" fontWeight="medium" truncate>
          {fileItem.file.name}
        </Text>
        <Text fontSize="xs" color="fg.muted">
          {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
        </Text>

        {/* Индикатор загрузки */}
        {fileItem.status === 'uploading' && (
          <Progress.Root value={null} size="xs" mt={1}>
            <Progress.Track>
              <Progress.Range />
            </Progress.Track>
          </Progress.Root>
        )}

        {/* Ошибка */}
        {fileItem.status === 'error' && (
          <Text fontSize="xs" color="error.solid" mt={1}>
            {fileItem.error}
          </Text>
        )}
      </Box>

      {/* Кнопка удаления */}
      <IconButton
        size="xs"
        variant="ghost"
        colorPalette="red"
        onClick={onRemove}
        disabled={fileItem.status === 'uploading'}
        aria-label="Удалить"
      >
        <LuTrash2 />
      </IconButton>
    </HStack>
  )
}
