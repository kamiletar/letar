'use client'

/**
 * Компонент загрузки фотографий автомобилей
 *
 * Включает dropzone и очередь загрузки
 * Выделен из vehicle-photos-dialog.tsx для переиспользуемости
 */

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, HStack, IconButton, Progress, Text, VStack } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { LuTrash2, LuUpload } from 'react-icons/lu'
import { type UploadedFile, validateImageFile } from './vehicle-photo-utils'

interface VehiclePhotosUploaderProps {
  vehicleId: string
  remainingSlots: number
  pendingCount: number
  uploadQueue: UploadedFile[]
  onFilesSelected: (files: File[]) => void
  onRemoveFile: (file: UploadedFile) => void
  onUploadComplete: () => void
  setUploadQueue: React.Dispatch<React.SetStateAction<UploadedFile[]>>
}

export function VehiclePhotosUploader({
  vehicleId,
  remainingSlots,
  pendingCount,
  uploadQueue,
  onFilesSelected,
  onRemoveFile,
  onUploadComplete,
  setUploadQueue,
}: VehiclePhotosUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const canUploadMore = remainingSlots > 0
  const uploadingCount = uploadQueue.filter((f) => f.status === 'uploading').length

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || !canUploadMore) {
      return
    }

    // Обрабатываем все выбранные файлы
    const validFiles: File[] = []
    for (let i = 0; i < fileList.length && validFiles.length < remainingSlots; i++) {
      const file = fileList[i]
      const validation = validateImageFile(file)
      if (validation.valid) {
        validFiles.push(file)
      } else {
        toaster.error({ title: 'Ошибка', description: `${file.name}: ${validation.error}` })
      }
    }

    // Передаём все валидные файлы за один раз
    if (validFiles.length > 0) {
      onFilesSelected(validFiles)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files)
  }

  const uploadFiles = async () => {
    const pendingFiles = uploadQueue.filter((f) => f.status === 'pending')
    const successfulPreviews: string[] = []

    for (const fileItem of pendingFiles) {
      setUploadQueue((prev) => prev.map((f) => (f.preview === fileItem.preview ? { ...f, status: 'uploading' } : f)))

      const formData = new FormData()
      formData.append('file', fileItem.file)
      formData.append('vehicleId', vehicleId)

      try {
        const response = await fetch('/api/upload/vehicles', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        successfulPreviews.push(fileItem.preview)
      } catch (error) {
        setUploadQueue((prev) =>
          prev.map((f) =>
            f.preview === fileItem.preview
              ? {
                  ...f,
                  status: 'error',
                  error: error instanceof Error ? error.message : 'Ошибка загрузки',
                }
              : f
          )
        )
      }
    }

    if (successfulPreviews.length > 0) {
      for (const preview of successfulPreviews) {
        URL.revokeObjectURL(preview)
      }

      setUploadQueue((prev) => prev.filter((f) => !successfulPreviews.includes(f.preview)))

      toaster.success({
        title: 'Фотографии загружены',
        description: `Успешно загружено ${successfulPreviews.length} фото`,
      })

      onUploadComplete()
    }
  }

  return (
    <>
      {/* Dropzone */}
      {canUploadMore && (
        <Box
          borderWidth="2px"
          borderStyle="dashed"
          borderColor={isDragging ? 'brand.solid' : 'border'}
          borderRadius="md"
          p={4}
          textAlign="center"
          bg={isDragging ? 'brand.subtle' : 'transparent'}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          cursor="pointer"
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleInputChange}
            style={{ display: 'none' }}
          />
          <LuUpload size={24} style={{ margin: '0 auto 8px' }} />
          <Text fontSize="sm" fontWeight="medium">
            Перетащите фото или нажмите для выбора
          </Text>
          <Text fontSize="xs" color="fg.muted">
            JPG, PNG, WEBP (макс. 10MB) • Осталось: {remainingSlots - pendingCount}
          </Text>
        </Box>
      )}

      {/* Очередь загрузки */}
      {uploadQueue.length > 0 && (
        <VStack gap={2} align="stretch">
          <HStack justify="space-between">
            <Text fontSize="sm">Файлов: {uploadQueue.length}</Text>
            {pendingCount > 0 && (
              <Button size="xs" colorPalette="brand" onClick={uploadFiles} loading={uploadingCount > 0}>
                Загрузить
              </Button>
            )}
          </HStack>

          {uploadQueue.map((fileItem) => (
            <HStack key={fileItem.file.name} gap={2} p={2} borderWidth="1px" borderRadius="md">
              <Box width="40px" height="40px" borderRadius="md" overflow="hidden" flexShrink={0}>
                {/* oxlint-disable-next-line eslint-plugin-next(no-img-element) -- data URL preview */}
                <img
                  src={fileItem.preview}
                  alt={fileItem.file.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </Box>
              <Box flex="1">
                <Text fontSize="xs" fontWeight="medium" truncate>
                  {fileItem.file.name}
                </Text>
                {fileItem.status === 'uploading' && (
                  <Progress.Root value={null} size="xs" mt={1}>
                    <Progress.Track>
                      <Progress.Range />
                    </Progress.Track>
                  </Progress.Root>
                )}
                {fileItem.status === 'error' && (
                  <Text fontSize="xs" color="error.solid">
                    {fileItem.error}
                  </Text>
                )}
              </Box>
              <IconButton
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={() => onRemoveFile(fileItem)}
                disabled={fileItem.status === 'uploading'}
                aria-label="Удалить"
              >
                <LuTrash2 />
              </IconButton>
            </HStack>
          ))}
        </VStack>
      )}

      {/* Лимит */}
      {!canUploadMore && (
        <Text fontSize="sm" color="orange.fg">
          Достигнут лимит фотографий. Удалите одну, чтобы добавить новую.
        </Text>
      )}
    </>
  )
}
