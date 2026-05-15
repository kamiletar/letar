'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useRouter } from '@/i18n/navigation'
import { getImageUrl } from '@/lib/images/get-image-url'
import { Badge, Box, Button, HStack, Image, Table, Text, VStack } from '@chakra-ui/react'
import { useState, useTransition } from 'react'
import { FiExternalLink, FiTrash2 } from 'react-icons/fi'
import { deleteImage } from '../_actions/delete-image'
import type { ImageWithUsage } from '../_actions/get-images'

interface ImagesTableProps {
  images: ImageWithUsage[]
}

/**
 * Форматирование размера файла.
 */
function formatSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Б'
  }

  const sizes = ['Б', 'КБ', 'МБ', 'ГБ']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))

  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Форматирование даты.
 */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Получить название категории на русском.
 */
function getCategoryLabel(category: string): string {
  switch (category) {
    case 'PRODUCT':
      return 'Товар'
    case 'AVATAR':
      return 'Аватар'
    case 'REFERENCE':
      return 'Ориентир'
    case 'NOTIFICATION':
      return 'Уведомление'
    default:
      return category
  }
}

/**
 * Получить цвет бейджа категории.
 */
function getCategoryColor(category: string): string {
  switch (category) {
    case 'PRODUCT':
      return 'green'
    case 'AVATAR':
      return 'blue'
    case 'REFERENCE':
      return 'purple'
    case 'NOTIFICATION':
      return 'orange'
    default:
      return 'gray'
  }
}

export function ImagesTable({ images }: ImagesTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (image: ImageWithUsage) => {
    const totalUsage = image.variantImagesCount + image.userProfilesCount + image.customOrdersCount

    if (totalUsage > 0) {
      toaster.error({
        title: 'Невозможно удалить',
        description: `Изображение используется в ${totalUsage} местах`,
      })
      return
    }

    if (!confirm(`Удалить изображение "${image.filename}"?`)) {
      return
    }

    setDeletingId(image.id)

    try {
      const result = await deleteImage(image.id)

      if (result.success) {
        toaster.success({
          title: 'Изображение удалено',
        })
        startTransition(() => {
          router.refresh()
        })
      } else {
        toaster.error({
          title: 'Ошибка удаления',
          description: result.error,
        })
      }
    } finally {
      setDeletingId(null)
    }
  }

  if (images.length === 0) {
    return (
      <Box py={8} textAlign="center" color="fg.muted">
        Изображения не найдены
      </Box>
    )
  }

  return (
    <Table.Root size="sm" interactive>
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeader w="80px">Превью</Table.ColumnHeader>
          <Table.ColumnHeader>Файл</Table.ColumnHeader>
          <Table.ColumnHeader>Категория</Table.ColumnHeader>
          <Table.ColumnHeader>Размер</Table.ColumnHeader>
          <Table.ColumnHeader>Размеры (px)</Table.ColumnHeader>
          <Table.ColumnHeader>Использование</Table.ColumnHeader>
          <Table.ColumnHeader>Загружено</Table.ColumnHeader>
          <Table.ColumnHeader w="100px">Действия</Table.ColumnHeader>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {images.map((image) => {
          const totalUsage = image.variantImagesCount + image.userProfilesCount + image.customOrdersCount
          const isUnused = totalUsage === 0

          return (
            <Table.Row key={image.id} bg={isUnused ? 'red.50' : undefined}>
              <Table.Cell>
                <Box w="60px" h="60px" borderRadius="md" overflow="hidden" border="1px solid" borderColor="border">
                  <Image src={getImageUrl(image.path)} alt={image.filename} w="100%" h="100%" objectFit="cover" />
                </Box>
              </Table.Cell>
              <Table.Cell>
                <VStack align="start" gap={0}>
                  <Text fontWeight="medium" fontSize="sm" wordBreak="break-all">
                    {image.filename}
                  </Text>
                  <Text fontSize="xs" color="fg.muted">
                    {image.path}
                  </Text>
                </VStack>
              </Table.Cell>
              <Table.Cell>
                <Badge colorPalette={getCategoryColor(image.category)}>{getCategoryLabel(image.category)}</Badge>
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="sm">{formatSize(image.size)}</Text>
              </Table.Cell>
              <Table.Cell>
                {image.width && image.height ? (
                  <Text fontSize="sm">
                    {image.width}×{image.height}
                  </Text>
                ) : (
                  <Text fontSize="sm" color="fg.muted">
                    —
                  </Text>
                )}
              </Table.Cell>
              <Table.Cell>
                {isUnused ? (
                  <Badge colorPalette="red">Не используется</Badge>
                ) : (
                  <VStack align="start" gap={0}>
                    {image.variantImagesCount > 0 && <Text fontSize="xs">Товары: {image.variantImagesCount}</Text>}
                    {image.userProfilesCount > 0 && <Text fontSize="xs">Профили: {image.userProfilesCount}</Text>}
                    {image.customOrdersCount > 0 && <Text fontSize="xs">Заказы: {image.customOrdersCount}</Text>}
                  </VStack>
                )}
              </Table.Cell>
              <Table.Cell>
                <Text fontSize="sm">{formatDate(image.uploadedAt)}</Text>
              </Table.Cell>
              <Table.Cell>
                <HStack gap={1}>
                  <Button size="xs" variant="ghost" asChild>
                    {/* oxlint-disable-next-line next/no-html-link-for-pages -- внешняя ссылка на файл */}
                    <a href={getImageUrl(image.path)} target="_blank" rel="noopener noreferrer">
                      <FiExternalLink />
                    </a>
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    colorPalette="red"
                    onClick={() => handleDelete(image)}
                    loading={deletingId === image.id || isPending}
                    disabled={!isUnused}
                    title={isUnused ? 'Удалить изображение' : 'Изображение используется'}
                  >
                    <FiTrash2 />
                  </Button>
                </HStack>
              </Table.Cell>
            </Table.Row>
          )
        })}
      </Table.Body>
    </Table.Root>
  )
}
