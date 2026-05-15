'use client'

import { useConfirmDialog } from '@/app/_components/ui/confirm-dialog'
import { toaster } from '@/app/_components/ui/toaster'
import { getImageUrl } from '@/lib/images/get-image-url'
import { Badge, Box, Button, HStack, Image, Table, Text, VStack } from '@chakra-ui/react'
import { Copy, ExternalLink, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deleteImage } from '../_actions/delete-image.action'
import type { ImageItem } from '../_actions/get-images.action'

interface ImagesTableProps {
  images: ImageItem[]
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
    case 'BLOG':
      return 'Блог'
    case 'CONTENT':
      return 'Контент'
    case 'AVATAR':
      return 'Аватар'
    case 'OTHER':
      return 'Прочее'
    default:
      return category
  }
}

/**
 * Получить цвет бейджа категории.
 */
function getCategoryColor(category: string): string {
  switch (category) {
    case 'BLOG':
      return 'green'
    case 'CONTENT':
      return 'blue'
    case 'AVATAR':
      return 'purple'
    case 'OTHER':
      return 'gray'
    default:
      return 'gray'
  }
}

export function ImagesTable({ images }: ImagesTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const handleCopyUrl = async (path: string) => {
    const url = `${window.location.origin}${getImageUrl(path)}`
    await navigator.clipboard.writeText(url)
    toaster.success({
      title: 'URL скопирован',
      description: url,
    })
  }

  const handleDelete = async (image: ImageItem) => {
    if (!(await confirm({ title: `Удалить изображение "${image.filename}"?` }))) {
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
    <>
      <ConfirmDialog />
      <Box overflowX="auto">
        <Table.Root size="sm" interactive>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeader minW="80px">Превью</Table.ColumnHeader>
              <Table.ColumnHeader>Файл</Table.ColumnHeader>
              <Table.ColumnHeader>Категория</Table.ColumnHeader>
              <Table.ColumnHeader>Размер</Table.ColumnHeader>
              <Table.ColumnHeader>Размеры (px)</Table.ColumnHeader>
              <Table.ColumnHeader>Загружено</Table.ColumnHeader>
              <Table.ColumnHeader minW="140px">Действия</Table.ColumnHeader>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {images.map((image) => (
              <Table.Row key={image.id}>
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
                  <Text fontSize="sm">{formatDate(image.uploadedAt)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <HStack gap={1}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCopyUrl(image.path)}
                      aria-label="Копировать URL"
                      title="Копировать URL"
                    >
                      <Copy size={16} />
                    </Button>
                    <Button size="sm" variant="ghost" asChild aria-label="Открыть в новой вкладке">
                      {/* oxlint-disable-next-line next/no-html-link-for-pages -- внешняя ссылка на файл */}
                      <a
                        href={getImageUrl(image.path)}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Открыть в новой вкладке"
                      >
                        <ExternalLink size={16} />
                      </a>
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      colorPalette="red"
                      onClick={() => handleDelete(image)}
                      loading={deletingId === image.id || isPending}
                      aria-label="Удалить изображение"
                      title="Удалить изображение"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </HStack>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Box>
    </>
  )
}
