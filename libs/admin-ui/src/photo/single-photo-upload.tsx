'use client'

import { Box, Button, Card, Image, Text } from '@chakra-ui/react'
import { useImageUpload } from '@letar/image-upload'
import { Upload } from 'lucide-react'
import { useRef, useTransition } from 'react'

export interface SinglePhotoUploadProps {
  /** Текущий URL картинки или `null`, если ещё не загружена */
  imageUrl: string | null
  /** Категория для `useImageUpload` — своя папка загрузки на приложение */
  category: string
  /** Вызывается с URL загруженного файла — сохранение (server action) и `router.refresh()` держит вызывающий компонент */
  onUpload: (url: string) => Promise<void> | void
  /** Заголовок карточки */
  title?: string
  /** Текст-заглушка, пока картинки нет */
  emptyText?: string
  /** Текст кнопки, когда картинки ещё нет */
  uploadLabel?: string
  /** Текст кнопки, когда картинка уже есть */
  replaceLabel?: string
  /** `avatar` — круглое превью фиксированного размера, `cover` — прямоугольное превью на всю ширину */
  variant?: 'avatar' | 'cover'
}

/**
 * Карточка загрузки одной картинки (не галереи) — превью/заглушка + кнопка загрузки через
 * `useImageUpload`. Сохранение URL и обновление страницы — на стороне вызывающего компонента
 * через `onUpload`, библиотека не знает о конкретной Prisma-модели/server action.
 */
export function SinglePhotoUpload({
  imageUrl,
  category,
  onUpload,
  title = 'Обложка',
  emptyText = 'Пока нет обложки',
  uploadLabel = 'Загрузить обложку',
  replaceLabel = 'Заменить обложку',
  variant = 'cover',
}: SinglePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [, startTransition] = useTransition()
  const { upload, isUploading } = useImageUpload({ category })

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }
    const uploaded = await upload(file)
    if (uploaded) {
      startTransition(async () => {
        await onUpload(uploaded.url)
      })
    }
  }

  return (
    <Card.Root shadow="sm">
      <Card.Header>
        <Box fontWeight="semibold" fontSize="sm">
          {title}
        </Box>
      </Card.Header>
      <Card.Body>
        {imageUrl
          ? (
            variant === 'avatar'
              ? <Image src={imageUrl} alt="" boxSize="32" borderRadius="full" objectFit="cover" mb={4} />
              : <Image src={imageUrl} alt="" maxH="48" borderRadius="md" objectFit="cover" mb={4} />
          )
          : (
            <Text fontSize="sm" color="fg.muted" mb={4}>
              {emptyText}
            </Text>
          )}
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
        <Button size="sm" variant="outline" loading={isUploading} onClick={() => inputRef.current?.click()}>
          <Upload size={14} />
          {imageUrl ? replaceLabel : uploadLabel}
        </Button>
      </Card.Body>
    </Card.Root>
  )
}
