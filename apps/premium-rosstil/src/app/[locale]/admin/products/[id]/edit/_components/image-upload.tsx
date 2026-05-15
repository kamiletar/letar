'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, HStack, Progress, Text, VStack } from '@chakra-ui/react'
import { useRef, useState, useTransition } from 'react'
import { saveVariantImages } from '../_actions/upload-images'

interface ImageUploadProps {
  productId: string
  variantId: string
  onSuccess?: () => void
}

interface UploadedFile {
  file: File
  preview: string
  status: 'pending' | 'uploading' | 'success' | 'error'
  imageId?: string
  url?: string
  error?: string
}

/**
 * Компонент массовой загрузки изображений с drag-and-drop.
 * Использует существующий API endpoint /api/upload для загрузки файлов.
 */
export function ImageUpload({ productId, variantId, onSuccess }: ImageUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) {
      return
    }

    const newFiles: UploadedFile[] = Array.from(fileList).map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      status: 'pending' as const,
    }))

    setFiles((prev) => [...prev, ...newFiles])
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
    const pendingFiles = files.filter((f) => f.status === 'pending')
    const uploadedImages: Array<{ imageId: string; url: string }> = []

    // Загружаем файлы на сервер через API
    for (const fileItem of pendingFiles) {
      setFiles((prev) => prev.map((f) => (f === fileItem ? { ...f, status: 'uploading' } : f)))

      const formData = new FormData()
      formData.append('file', fileItem.file)

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Upload failed')
        }

        const data = await response.json()

        setFiles((prev) =>
          prev.map((f) => (f === fileItem ? { ...f, status: 'success', imageId: data.id, url: data.url } : f))
        )

        // Собираем успешно загруженные изображения
        uploadedImages.push({ imageId: data.id, url: data.url })
      } catch (error) {
        setFiles((prev) =>
          prev.map((f) =>
            f === fileItem
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

    // Сохраняем успешно загруженные изображения в БД
    if (uploadedImages.length > 0) {
      startTransition(async () => {
        try {
          await saveVariantImages(
            productId,
            variantId,
            uploadedImages.map(({ imageId }) => ({ imageId }))
          )

          // Очищаем список после успешного сохранения
          setFiles([])
          onSuccess?.()

          toaster.success({
            title: 'Изображения загружены',
            description: `Успешно загружено ${uploadedImages.length} ${
              uploadedImages.length === 1 ? 'изображение' : uploadedImages.length < 5 ? 'изображения' : 'изображений'
            }`,
          })
        } catch (error) {
          console.error('Failed to save images:', error)
          toaster.error({
            title: 'Ошибка сохранения',
            description: error instanceof Error ? error.message : 'Не удалось сохранить изображения',
          })
        }
      })
    } else if (pendingFiles.length > 0) {
      // Если были файлы для загрузки, но все завершились с ошибкой
      toaster.error({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить ни одного файла. Проверьте ошибки выше.',
      })
    }
  }

  const removeFile = (fileItem: UploadedFile) => {
    URL.revokeObjectURL(fileItem.preview)
    setFiles((prev) => prev.filter((f) => f !== fileItem))
  }

  const pendingCount = files.filter((f) => f.status === 'pending').length
  const uploadingCount = files.filter((f) => f.status === 'uploading').length
  const successCount = files.filter((f) => f.status === 'success').length

  return (
    <VStack gap={4} align="stretch">
      {/* Dropzone */}
      <Box
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragging ? 'blue.500' : 'border'}
        borderRadius="md"
        p={8}
        textAlign="center"
        bg={isDragging ? 'blue.50' : 'transparent'}
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
        <Text fontSize="lg" fontWeight="medium" mb={2}>
          Перетащите изображения сюда или нажмите для выбора
        </Text>
        <Text fontSize="sm" color="fg.muted">
          Поддерживаются форматы: JPG, PNG, WEBP, GIF (макс. 32MB)
        </Text>
      </Box>

      {/* Preview List */}
      {files.length > 0 && (
        <VStack gap={2} align="stretch">
          <HStack justify="space-between">
            <Text fontWeight="medium">
              Файлов: {files.length} (загружено: {successCount}, ожидает: {pendingCount})
            </Text>
            {pendingCount > 0 && (
              <Button size="sm" colorPalette="fg" onClick={uploadFiles} loading={uploadingCount > 0 || isPending}>
                Загрузить все
              </Button>
            )}
          </HStack>

          {files.map((fileItem) => (
            <HStack key={fileItem.preview} gap={4} p={2} borderWidth="1px" borderRadius="md">
              <Box width="60px" height="60px" borderRadius="md" overflow="hidden" flexShrink={0}>
                {/* oxlint-disable-next-line next/no-img-element -- blob URL не поддерживается next/image */}
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
                <Text fontSize="sm" fontWeight="medium">
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
                  <Text fontSize="xs" color="red.500" mt={1}>
                    {fileItem.error}
                  </Text>
                )}
              </Box>
              <Button
                size="xs"
                variant="ghost"
                colorPalette="red"
                onClick={() => removeFile(fileItem)}
                disabled={fileItem.status === 'uploading'}
              >
                Удалить
              </Button>
            </HStack>
          ))}
        </VStack>
      )}
    </VStack>
  )
}
