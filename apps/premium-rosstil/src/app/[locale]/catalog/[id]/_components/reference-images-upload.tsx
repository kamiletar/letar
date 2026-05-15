'use client'

import {
  Box,
  FileUpload,
  Float,
  HStack,
  Icon,
  IconButton,
  Spinner,
  Text,
  useFileUpload,
  VStack,
} from '@chakra-ui/react'
import Image from 'next/image'
import { useCallback, useState } from 'react'
import { LuImagePlus, LuTrash2, LuUpload } from 'react-icons/lu'

// Структура для хранения информации о загруженном изображении
interface UploadedImage {
  id: string
  url: string
}

interface ReferenceImagesUploadProps {
  /** Имя поля для формы */
  name: string
  /** Максимальное количество файлов */
  maxFiles?: number
  /** Уже загруженные изображения (для редактирования) */
  initialImages?: UploadedImage[]
  /** Callback при изменении списка imageIds */
  onIdsChange?: (ids: string[]) => void
}

export function ReferenceImagesUpload({
  name,
  maxFiles = 5,
  initialImages = [],
  onIdsChange,
}: ReferenceImagesUploadProps) {
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>(initialImages)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleUpload = useCallback(
    async (files: File[]) => {
      if (files.length === 0) {
        return
      }

      // Проверяем лимит
      if (uploadedImages.length + files.length > maxFiles) {
        setError(`Максимум ${maxFiles} изображений`)
        return
      }

      setIsUploading(true)
      setError(null)

      const newImages: UploadedImage[] = []

      for (const file of files) {
        const formData = new FormData()
        formData.append('file', file)

        try {
          const response = await fetch('/api/upload/references', {
            method: 'POST',
            body: formData,
          })

          const data = await response.json()

          if (!response.ok) {
            setError(data.error || 'Ошибка загрузки')
            continue
          }

          // API возвращает { id, url, filename, ... }
          newImages.push({ id: data.id, url: data.url })
        } catch {
          setError('Ошибка соединения')
        }
      }

      if (newImages.length > 0) {
        const updated = [...uploadedImages, ...newImages]
        setUploadedImages(updated)
        onIdsChange?.(updated.map((img) => img.id))
      }

      setIsUploading(false)
    },
    [uploadedImages, maxFiles, onIdsChange]
  )

  const handleRemove = useCallback(
    async (imageId: string) => {
      // Удаляем файл с сервера
      try {
        await fetch(`/api/upload/references?id=${encodeURIComponent(imageId)}`, {
          method: 'DELETE',
        })
      } catch {
        // Игнорируем ошибки удаления
      }

      const updated = uploadedImages.filter((img) => img.id !== imageId)
      setUploadedImages(updated)
      onIdsChange?.(updated.map((img) => img.id))
    },
    [uploadedImages, onIdsChange]
  )

  const fileUpload = useFileUpload({
    accept: 'image/*',
    maxFiles: maxFiles - uploadedImages.length,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    onFileChange: (details) => {
      if (details.acceptedFiles.length > 0) {
        handleUpload(details.acceptedFiles)
        // Очищаем выбранные файлы после загрузки
        fileUpload.clearFiles()
      }
    },
  })

  const canUploadMore = uploadedImages.length < maxFiles

  return (
    <VStack align="stretch" gap={3}>
      {/* Скрытые инпуты для передачи imageIds в форму */}
      {uploadedImages.map((img, imgIndex) => (
        <input key={img.id} type="hidden" name={`${name}[${imgIndex}]`} value={img.id} />
      ))}

      {/* Загруженные изображения */}
      {uploadedImages.length > 0 && (
        <HStack wrap="wrap" gap={3}>
          {uploadedImages.map((img) => (
            <Box key={img.id} position="relative" borderRadius="md" overflow="hidden" boxSize="100px">
              <Image src={img.url} alt="Фото-ориентир" fill style={{ objectFit: 'cover' }} sizes="100px" />
              <Float placement="top-end" offset={1}>
                <IconButton
                  aria-label="Удалить"
                  size="xs"
                  variant="solid"
                  colorPalette="red"
                  onClick={() => handleRemove(img.id)}
                >
                  <LuTrash2 />
                </IconButton>
              </Float>
            </Box>
          ))}
        </HStack>
      )}

      {/* Dropzone */}
      {canUploadMore && (
        <FileUpload.RootProvider value={fileUpload}>
          <FileUpload.HiddenInput />
          <FileUpload.Dropzone
            cursor="pointer"
            borderStyle="dashed"
            borderWidth={2}
            borderColor="border.muted"
            borderRadius="md"
            py={6}
            px={4}
            _hover={{ borderColor: 'fg.default', bg: 'bg.subtle' }}
          >
            {isUploading ? (
              <VStack>
                <Spinner size="md" color="fg.muted" />
                <Text color="fg.muted" fontSize="sm">
                  Загрузка...
                </Text>
              </VStack>
            ) : (
              <VStack>
                <Icon fontSize="2xl" color="fg.muted">
                  {uploadedImages.length === 0 ? <LuUpload /> : <LuImagePlus />}
                </Icon>
                <Text color="fg.muted" fontSize="sm" textAlign="center">
                  {uploadedImages.length === 0
                    ? 'Перетащите фото или нажмите для выбора'
                    : `Добавить ещё (${uploadedImages.length}/${maxFiles})`}
                </Text>
                <Text color="fg.subtle" fontSize="xs">
                  PNG, JPG до 10MB
                </Text>
              </VStack>
            )}
          </FileUpload.Dropzone>
        </FileUpload.RootProvider>
      )}

      {/* Ошибка */}
      {error && (
        <Text color="fg.error" fontSize="sm">
          {error}
        </Text>
      )}
    </VStack>
  )
}
