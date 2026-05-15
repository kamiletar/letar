'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Center, Spinner, Stack, Text } from '@chakra-ui/react'
import { OptimizedAvatar } from '@letar/ui'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { useCallback, useRef, useState } from 'react'
import type { Area } from 'react-easy-crop'
import { LuCamera, LuTrash2, LuUpload } from 'react-icons/lu'

// Ленивая загрузка диалога обрезки — react-easy-crop загружается только при открытии
const AvatarCropDialog = dynamic(
  () => import('./avatar-crop-dialog').then((mod) => ({ default: mod.AvatarCropDialog })),
  {
    ssr: false,
    loading: () => (
      <Center h="300px">
        <Spinner size="lg" colorPalette="brand" />
      </Center>
    ),
  }
)

interface AvatarUploadProps {
  currentImage: string | null
  userName: string
}

/**
 * Компонент загрузки и кропа аватара пользователя.
 * Использует react-easy-crop для обрезки изображений.
 * Поддерживает drag-and-drop загрузку.
 */
export function AvatarUpload({ currentImage, userName }: AvatarUploadProps) {
  const router = useRouter()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentImage)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  // Валидация и обработка файла (общая для input и drag-and-drop)
  const processFile = useCallback((file: File) => {
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toaster.error({
        title: 'Ошибка',
        description: 'Выбранный файл не является изображением',
      })
      return
    }

    // Проверка размера (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toaster.error({
        title: 'Ошибка',
        description: 'Размер файла не должен превышать 5MB',
      })
      return
    }

    // Читаем файл как data URL
    const reader = new FileReader()
    reader.onload = () => {
      setSelectedImage(reader.result as string)
      setDialogOpen(true)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    }
    reader.readAsDataURL(file)
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  // Drag-and-drop обработчики
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    // Проверяем, что мы действительно покинули зону, а не вошли в дочерний элемент
    if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const file = e.dataTransfer.files?.[0]
      if (file) {
        processFile(file)
      }
    },
    [processFile]
  )

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()
      image.addEventListener('load', () => resolve(image))
      image.addEventListener('error', (error) => reject(error))
      image.src = url
    })

  const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<Blob> => {
    const image = await createImage(imageSrc)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      throw new Error('No 2d context')
    }

    // Устанавливаем размер canvas равным размеру обрезанной области
    canvas.width = pixelCrop.width
    canvas.height = pixelCrop.height

    // Рисуем обрезанное изображение
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    )

    // Конвертируем canvas в blob
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas is empty'))
            return
          }
          resolve(blob)
        },
        'image/jpeg',
        0.95
      )
    })
  }

  const handleSave = async () => {
    if (!selectedImage || !croppedAreaPixels) {
      return
    }

    setIsUploading(true)

    try {
      // Получаем обрезанное изображение
      const croppedBlob = await getCroppedImg(selectedImage, croppedAreaPixels)

      // Создаем FormData для загрузки
      const formData = new FormData()
      formData.append('file', croppedBlob, 'avatar.jpg')

      // Загружаем на сервер
      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка загрузки')
      }

      // Обновляем локальное состояние
      setAvatarUrl(data.url)

      toaster.success({ title: 'Фото обновлено' })

      setDialogOpen(false)
      setSelectedImage(null)
      router.refresh()
    } catch (error) {
      console.error('Upload error:', error)
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось загрузить фото',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!avatarUrl) {
      return
    }

    setIsDeleting(true)

    try {
      const response = await fetch('/api/upload/avatar', {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка удаления')
      }

      // Обновляем локальное состояние
      setAvatarUrl(null)

      toaster.success({ title: 'Фото удалено' })
      router.refresh()
    } catch (error) {
      console.error('Delete error:', error)
      toaster.error({
        title: 'Ошибка',
        description: 'Не удалось удалить фото',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    setDialogOpen(false)
    setSelectedImage(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Box>
      {/* Вся область - drop zone */}
      <Box
        ref={dropZoneRef}
        position="relative"
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        p={4}
        borderRadius="lg"
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={isDragging ? 'fg.500' : 'transparent'}
        bg={isDragging ? 'fg.muted/10' : 'transparent'}
        transition="all 0.2s"
      >
        <Stack direction={{ base: 'column', sm: 'row' }} align={{ base: 'stretch', sm: 'center' }} gap={4}>
          {/* Аватар */}
          <Box
            position="relative"
            onClick={() => fileInputRef.current?.click()}
            cursor="pointer"
            borderRadius="full"
            transition="all 0.2s"
            _hover={{ opacity: 0.8 }}
            alignSelf={{ base: 'center', sm: 'flex-start' }}
          >
            <OptimizedAvatar src={avatarUrl} name={userName} size="2xl" />
          </Box>

          <Stack gap={2} flex={1}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            <Button onClick={() => fileInputRef.current?.click()} colorPalette="brand" size="sm">
              <LuCamera />
              {avatarUrl ? 'Изменить фото' : 'Загрузить фото'}
            </Button>

            {avatarUrl && (
              <Button onClick={handleDelete} colorPalette="red" variant="outline" size="sm" loading={isDeleting}>
                <LuTrash2 />
                Удалить
              </Button>
            )}

            <Text fontSize="sm" color="fg.muted">
              JPG, PNG или GIF. Максимум 5MB.
              <br />
              Или перетащите изображение сюда.
            </Text>
          </Stack>
        </Stack>

        {/* Overlay при перетаскивании */}
        {isDragging && (
          <Box
            position="absolute"
            inset={0}
            bg="blackAlpha.500"
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
            pointerEvents="none"
          >
            <Stack align="center" gap={2}>
              <LuUpload color="white" size={32} />
              <Text color="white" fontWeight="medium">
                Отпустите для загрузки
              </Text>
            </Stack>
          </Box>
        )}
      </Box>

      {/* Диалог с кропером — ленивая загрузка react-easy-crop */}
      <AvatarCropDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        selectedImage={selectedImage}
        crop={crop}
        onCropChange={setCrop}
        zoom={zoom}
        onZoomChange={setZoom}
        onCropComplete={onCropComplete}
        isUploading={isUploading}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </Box>
  )
}
