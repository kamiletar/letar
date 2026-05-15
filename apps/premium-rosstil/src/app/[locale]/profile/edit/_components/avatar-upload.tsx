'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Avatar, Box, Button, Dialog, Portal, Stack, Text } from '@chakra-ui/react'
import { useCallback, useRef, useState } from 'react'
import type { Area } from 'react-easy-crop'
import Cropper from 'react-easy-crop'
import { FaCamera, FaTrash } from 'react-icons/fa'
import { updateAvatar } from '../_actions/update-avatar'

interface AvatarUploadProps {
  currentImage: string | null
  userName: string
}

/**
 * Компонент загрузки и кропа аватара пользователя.
 * Использует react-easy-crop для обрезки изображений.
 */
export function AvatarUpload({ currentImage, userName }: AvatarUploadProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentImage)
  // Храним ID изображения для возможности удаления
  const [avatarImageId, setAvatarImageId] = useState<string | null>(null)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      toaster.error({
        title: 'Ошибка',
        description: 'Выбранный файл не является изображением',
      })
      return
    }

    // Проверка размера (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toaster.error({
        title: 'Ошибка',
        description: 'Размер файла не должен превышать 2MB',
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
  }

  /**
   * Создаёт HTMLImageElement из URL.
   * Очищает event listeners после загрузки для предотвращения утечек памяти.
   */
  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image()

      const handleLoad = () => {
        // Очищаем listeners после загрузки
        image.removeEventListener('load', handleLoad)
        image.removeEventListener('error', handleError)
        resolve(image)
      }

      const handleError = (error: Event) => {
        // Очищаем listeners при ошибке
        image.removeEventListener('load', handleLoad)
        image.removeEventListener('error', handleError)
        reject(error)
      }

      image.addEventListener('load', handleLoad)
      image.addEventListener('error', handleError)
      image.src = url
    })

  /**
   * Обрезает изображение по указанным координатам.
   * Очищает canvas после создания blob для предотвращения утечек памяти.
   */
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

    // Конвертируем canvas в blob и очищаем ресурсы
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          // Очищаем canvas для освобождения памяти
          ctx.clearRect(0, 0, canvas.width, canvas.height)
          canvas.width = 0
          canvas.height = 0

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

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Ошибка загрузки')
      }

      const data = await response.json()

      // Обновляем аватар в базе данных (используем imageId)
      await updateAvatar(data.id)

      // Обновляем локальное состояние
      setAvatarUrl(data.url)
      setAvatarImageId(data.id)

      toaster.success({
        title: 'Успех',
        description: 'Аватар успешно загружен',
      })

      setDialogOpen(false)
      setSelectedImage(null)
    } catch (error) {
      console.error('Upload error:', error)
      toaster.error({
        title: 'Ошибка',
        description: error instanceof Error ? error.message : 'Не удалось загрузить аватар',
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
      // Удаляем файл с сервера (если это загруженный аватар, не OAuth)
      // Загруженные аватары имеют формат /api/files/avatars/...
      if (avatarUrl.startsWith('/api/files/avatars/') && avatarImageId) {
        const response = await fetch(`/api/upload/avatar?id=${encodeURIComponent(avatarImageId)}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Ошибка удаления файла')
        }
      }

      // Обновляем аватар в базе данных (устанавливаем null)
      await updateAvatar(null)

      // Обновляем локальное состояние
      setAvatarUrl(null)
      setAvatarImageId(null)

      toaster.success({
        title: 'Успех',
        description: 'Аватар удалён',
      })
    } catch (error) {
      console.error('Delete error:', error)
      toaster.error({
        title: 'Ошибка',
        description: 'Не удалось удалить аватар',
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
      <Stack direction="row" align="center" gap={4}>
        <Avatar.Root size="2xl">
          <Avatar.Fallback name={userName} />
          <Avatar.Image src={avatarUrl || undefined} />
        </Avatar.Root>

        <Stack gap={2}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />

          <Button onClick={() => fileInputRef.current?.click()} colorPalette="fg" size="sm">
            <FaCamera />
            {avatarUrl ? 'Изменить аватар' : 'Загрузить аватар'}
          </Button>

          {avatarUrl && (
            <Button onClick={handleDelete} colorPalette="red" variant="outline" size="sm" loading={isDeleting}>
              <FaTrash />
              Удалить аватар
            </Button>
          )}

          <Text fontSize="sm" color="fg.muted">
            JPG, PNG или GIF. Максимум 2MB.
          </Text>
        </Stack>
      </Stack>

      {/* Диалог с кропером */}
      <Dialog.Root open={dialogOpen} onOpenChange={(e) => !isUploading && setDialogOpen(e.open)}>
        <Portal>
          <Dialog.Positioner>
            <Dialog.Content maxW="600px">
              <Dialog.Header>
                <Dialog.Title>Обрезка изображения</Dialog.Title>
              </Dialog.Header>

              <Dialog.Body>
                {selectedImage && (
                  <Box position="relative" height="400px" bg="gray.100" borderRadius="md">
                    <Cropper
                      image={selectedImage}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onZoomChange={setZoom}
                      onCropComplete={onCropComplete}
                    />
                  </Box>
                )}

                <Box mt={4}>
                  <Text fontSize="sm" mb={2}>
                    Масштаб
                  </Text>
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    style={{ width: '100%' }}
                  />
                </Box>
              </Dialog.Body>

              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
                    Отмена
                  </Button>
                </Dialog.ActionTrigger>
                <Button colorPalette="fg" onClick={handleSave} loading={isUploading}>
                  Сохранить
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </Box>
  )
}
