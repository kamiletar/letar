'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Button, HStack, Text, VStack } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { RiDeleteBinLine, RiImageEditLine } from 'react-icons/ri'
import { UserAvatar } from './user-avatar'

interface AvatarUploadProps {
  currentImage?: string | null
  userName?: string | null
  onImageChange: (imageUrl: string | null) => void
}

/**
 * Компонент для загрузки и управления аватаром пользователя
 *
 * @example
 * <AvatarUpload
 *   currentImage={user.image}
 *   userName={user.name}
 *   onImageChange={(url) => setImageUrl(url)}
 * />
 */
export function AvatarUpload({ currentImage, userName, onImageChange }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImage || null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    // Валидация типа файла
    if (!file.type.startsWith('image/')) {
      toaster.create({
        title: 'Ошибка',
        description: 'Файл должен быть изображением',
        type: 'error',
      })
      return
    }

    // Валидация размера файла (макс 2MB)
    const maxSize = 2 * 1024 * 1024 // 2MB
    if (file.size > maxSize) {
      toaster.create({
        title: 'Ошибка',
        description: `Размер файла не должен превышать 2MB (файл: ${(file.size / 1024 / 1024).toFixed(2)} MB)`,
        type: 'error',
      })
      return
    }

    setIsUploading(true)

    try {
      // Загружаем файл на сервер
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload/avatar', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка при загрузке файла')
      }

      // Обновляем превью и вызываем callback
      setPreviewUrl(data.url)
      onImageChange(data.url)

      toaster.create({
        title: 'Успешно',
        description: 'Фото загружено',
        type: 'success',
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка'
      toaster.create({
        title: 'Ошибка',
        description: errorMessage,
        type: 'error',
      })
    } finally {
      setIsUploading(false)
      // Сбрасываем input, чтобы можно было загрузить тот же файл снова
      event.target.value = ''
    }
  }

  const handleDelete = async () => {
    if (!previewUrl) {
      return
    }

    try {
      // Удаляем файл с сервера (только если это не OAuth аватар)
      if (previewUrl.startsWith('/api/files/avatars/')) {
        await fetch(`/api/upload/avatar?url=${encodeURIComponent(previewUrl)}`, {
          method: 'DELETE',
        })
      }

      // Сбрасываем превью и вызываем callback
      setPreviewUrl(null)
      onImageChange(null)

      toaster.create({
        title: 'Успешно',
        description: 'Фото удалено',
        type: 'success',
      })
    } catch {
      toaster.create({
        title: 'Ошибка',
        description: 'Не удалось удалить фото',
        type: 'error',
      })
    }
  }

  return (
    <VStack gap={4} align="center">
      {/* Превью аватара */}
      <UserAvatar name={userName} image={previewUrl} size="2xl" />

      {/* Кнопки управления */}
      <HStack gap={3}>
        {/* Скрытый input для выбора файла */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
          disabled={isUploading}
        />

        {/* Кнопка загрузки */}
        <Button
          colorPalette="fg"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          loading={isUploading}
        >
          <RiImageEditLine />
          {previewUrl ? 'Изменить фото' : 'Загрузить фото'}
        </Button>

        {/* Кнопка удаления */}
        {previewUrl && (
          <Button colorPalette="red" variant="outline" size="sm" onClick={handleDelete} disabled={isUploading}>
            <RiDeleteBinLine />
            Удалить
          </Button>
        )}
      </HStack>

      {/* Подсказка */}
      <Text fontSize="xs" color="fg.muted" textAlign="center">
        Максимальный размер: 2MB
        <br />
        Форматы: JPG, PNG, GIF, WebP
      </Text>
    </VStack>
  )
}
