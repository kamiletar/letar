'use client'

import { Box, Button, HStack, IconButton, Progress, Text, VStack } from '@chakra-ui/react'
import { LuTrash2 } from 'react-icons/lu'

import type { UploadedFile } from './types'

interface UploadQueueProps {
  queue: UploadedFile[]
  pendingCount: number
  uploadingCount: number
  onUpload: () => void
  onRemove: (file: UploadedFile) => void
}

/**
 * Список файлов в очереди загрузки.
 */
export function UploadQueue({ queue, pendingCount, uploadingCount, onUpload, onRemove }: UploadQueueProps) {
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
          <Button size="xs" colorPalette="brand" onClick={onUpload} loading={uploadingCount > 0}>
            Загрузить все
          </Button>
        )}
      </HStack>

      {queue.map((fileItem) => (
        <HStack key={fileItem.file.name} gap={3} p={2} borderWidth="1px" borderRadius="md">
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
          <Box flex="1">
            <Text fontSize="xs" fontWeight="medium" truncate>
              {fileItem.file.name}
            </Text>
            <Text fontSize="xs" color="fg.muted">
              {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
            </Text>
            {fileItem.status === 'uploading' && (
              <Progress.Root value={null} size="xs" mt={1}>
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>
            )}
            {fileItem.status === 'error' && (
              <Text fontSize="xs" color="error.solid" mt={1}>
                {fileItem.error}
              </Text>
            )}
          </Box>
          <IconButton
            size="xs"
            variant="ghost"
            colorPalette="red"
            onClick={() => onRemove(fileItem)}
            disabled={fileItem.status === 'uploading'}
            aria-label="Удалить"
          >
            <LuTrash2 />
          </IconButton>
        </HStack>
      ))}
    </VStack>
  )
}
