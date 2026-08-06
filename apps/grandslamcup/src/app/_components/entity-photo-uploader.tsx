'use client'

/**
 * Универсальный компонент загрузки фото сущности (player, venue).
 * Квадратная зона: показывает текущее фото или плейсхолдер.
 * Клик → file input → для player показывает кроп-диалог → POST на /api/upload/entity-photo.
 * Для venue — прямая загрузка без кропа.
 */

import { AvatarCropDialog } from '@/app/_components/avatar-crop-dialog'
import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, Flex, Spinner, Text, VStack } from '@chakra-ui/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { type ReactNode, useCallback, useRef, useState } from 'react'
import { LuTrash2 } from 'react-icons/lu'

/** Максимальный размер на клиенте (15 МБ) */
const MAX_CLIENT_SIZE = 15 * 1024 * 1024

interface EntityPhotoUploaderProps {
  /** Тип сущности */
  entityType: 'player' | 'venue' | 'team'
  /** ID сущности */
  entityId: string
  /** Текущее фото (путь из БД) */
  currentPhoto?: string | null
  /** Размер квадрата (в пикселях) */
  size?: number
  /** Иконка-плейсхолдер */
  placeholder: ReactNode
  /** Подпись под зоной загрузки */
  label?: string
}

export function EntityPhotoUploader({
  entityType,
  entityId,
  currentPhoto,
  size = 120,
  placeholder,
  label,
}: EntityPhotoUploaderProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  // Состояние кроп-диалога
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [cropOpen, setCropOpen] = useState(false)
  // Храним оригинальное имя файла для FormData
  const [pendingFileName, setPendingFileName] = useState<string>('photo.jpg')

  /** Загрузка файла/blob на сервер */
  const uploadFile = useCallback(
    async (fileOrBlob: File | Blob, fileName?: string) => {
      setUploading(true)
      try {
        const formData = new FormData()
        // Если Blob — оборачиваем в File для корректного имени
        if (fileOrBlob instanceof Blob && !(fileOrBlob instanceof File)) {
          formData.append('file', fileOrBlob, fileName ?? 'cropped.jpg')
        } else {
          formData.append('file', fileOrBlob)
        }
        formData.append('entityType', entityType)
        formData.append('entityId', entityId)

        const res = await fetch('/api/upload/entity-photo', {
          method: 'POST',
          body: formData,
        })
        const data = await res.json()
        if (!res.ok) {
          toaster.error({ title: data.error ?? 'Ошибка загрузки' })
          return
        }
        toaster.success({ title: 'Фото обновлено' })
        router.refresh()
      } catch {
        toaster.error({ title: 'Ошибка загрузки' })
      } finally {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ''
      }
    },
    [entityType, entityId, router],
  )

  /** Обработка выбора файла */
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toaster.error({ title: 'Файл должен быть изображением' })
      return
    }
    if (file.size > MAX_CLIENT_SIZE) {
      toaster.error({ title: 'Максимальный размер 15 МБ' })
      return
    }

    // Для игроков и команд — показываем кроп-диалог (квадратный)
    if (entityType === 'player' || entityType === 'team') {
      setPendingFileName(file.name)
      const reader = new FileReader()
      reader.onload = () => {
        setCropImageSrc(reader.result as string)
        setCropOpen(true)
      }
      reader.readAsDataURL(file)
      return
    }

    // Для venue — прямая загрузка
    uploadFile(file)
  }

  /** Колбэк после кропа */
  const handleCrop = useCallback(
    (blob: Blob) => {
      setCropOpen(false)
      setCropImageSrc(null)
      uploadFile(blob, pendingFileName)
    },
    [uploadFile, pendingFileName],
  )

  /** Отмена кропа */
  const handleCropCancel = useCallback(() => {
    setCropOpen(false)
    setCropImageSrc(null)
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  /** Удаление фото */
  const handleDelete = useCallback(async () => {
    setDeleting(true)
    try {
      const res = await fetch('/api/upload/entity-photo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId }),
      })
      const data = await res.json()
      if (!res.ok) {
        toaster.error({ title: data.error ?? 'Ошибка удаления' })
        return
      }
      toaster.success({ title: 'Фото удалено' })
      router.refresh()
    } catch {
      toaster.error({ title: 'Ошибка удаления' })
    } finally {
      setDeleting(false)
    }
  }, [entityType, entityId, router])

  const photoUrl = currentPhoto ? (currentPhoto.startsWith('http') ? currentPhoto : `/api/files/${currentPhoto}`) : null

  return (
    <VStack gap={2}>
      <Box
        position="relative"
        w={`${size}px`}
        h={`${size}px`}
        borderRadius="xl"
        overflow="hidden"
        borderWidth="2px"
        borderStyle="dashed"
        borderColor={uploading ? 'brand.solid' : 'border'}
        cursor={uploading ? 'wait' : 'pointer'}
        _hover={{ borderColor: 'brand.solid', '& .overlay': { opacity: 1 } }}
        transition="border-color 0.15s"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {photoUrl
          ? <Image src={photoUrl} alt={label ?? 'Фото'} fill sizes={`${size}px`} style={{ objectFit: 'cover' }} />
          : (
            <Flex align="center" justify="center" h="full" bg="bg.subtle">
              {placeholder}
            </Flex>
          )}

        {/* Оверлей */}
        <Flex
          className="overlay"
          position="absolute"
          inset={0}
          align="center"
          justify="center"
          bg="blackAlpha.600"
          opacity={uploading ? 1 : 0}
          transition="opacity 0.2s"
        >
          {uploading ? <Spinner color="white" size="md" /> : (
            <Text fontSize="xs" color="white" fontWeight="medium">
              {photoUrl ? 'Заменить' : 'Загрузить'}
            </Text>
          )}
        </Flex>

        <Box position="absolute" opacity={0} pointerEvents="none" asChild>
          <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} />
        </Box>
      </Box>
      {label && (
        <Text fontSize="xs" color="fg.muted">
          {label}
        </Text>
      )}
      {photoUrl && (
        <Button
          size="xs"
          variant="ghost"
          colorPalette="red"
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          loading={deleting}
        >
          <LuTrash2 size={12} />
          Удалить
        </Button>
      )}

      {/* Кроп-диалог для аватаров игроков */}
      {cropImageSrc && (
        <AvatarCropDialog open={cropOpen} imageSrc={cropImageSrc} onCrop={handleCrop} onCancel={handleCropCancel} />
      )}
    </VStack>
  )
}
