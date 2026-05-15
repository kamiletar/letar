'use client'

import { Box, Button, HStack, IconButton, Input, SimpleGrid, Stack, Text } from '@chakra-ui/react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import {
  addProductImageAction,
  moveProductImageAction,
  removeProductImageAction,
} from '../../../_actions/products.action'

interface GalleryImage {
  productImageId: string
  imageId: string
  path: string
  alt: string
  sortOrder: number
}

export function ProductImageManager({ productId, images }: { productId: string; images: GalleryImage[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('category', 'products')
      fd.append('alt', '')

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = (await res.json()) as { id: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Не удалось загрузить')

      const link = await addProductImageAction(productId, data.id)
      if (!link.ok) throw new Error(link.error ?? 'Не удалось привязать к товару')

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  function run(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn()
      router.refresh()
    })
  }

  return (
    <Stack gap={6}>
      <Box>
        <Input
          ref={fileInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleUpload}
          disabled={uploading}
        />
        <Text fontSize="xs" color="fg.muted" mt={1}>
          jpg / png / webp, до 10 МБ. Первое изображение — главное (превью).
        </Text>
        {error && (
          <Box mt={2} p={3} bg="red.subtle" color="red.fg" borderRadius="md" fontSize="sm">
            {error}
          </Box>
        )}
      </Box>

      {images.length === 0
        ? (
          <Box p={12} bg="bg.subtle" borderRadius="xl" textAlign="center">
            <Text color="fg.muted">Пока нет изображений</Text>
          </Box>
        )
        : (
          <SimpleGrid columns={{ base: 2, md: 3, lg: 4 }} gap={4}>
            {images.map((img, idx) => (
              <Stack
                key={img.productImageId}
                gap={2}
                bg="bg.surface"
                borderRadius="lg"
                overflow="hidden"
                borderWidth="1px"
                borderColor="border"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/files/${img.path}`}
                  alt={img.alt}
                  style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover' }}
                />
                <HStack justify="space-between" px={3} pb={3}>
                  <HStack gap={1}>
                    <IconButton
                      size="xs"
                      variant="outline"
                      disabled={idx === 0 || isPending}
                      onClick={() => run(() => moveProductImageAction(img.productImageId, 'up'))}
                      aria-label="Вверх"
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      size="xs"
                      variant="outline"
                      disabled={idx === images.length - 1 || isPending}
                      onClick={() => run(() => moveProductImageAction(img.productImageId, 'down'))}
                      aria-label="Вниз"
                    >
                      ↓
                    </IconButton>
                  </HStack>
                  <Button
                    size="xs"
                    variant="outline"
                    colorPalette="red"
                    loading={isPending}
                    onClick={() => {
                      if (!confirm('Убрать изображение из галереи?')) return
                      run(() => removeProductImageAction(img.productImageId))
                    }}
                  >
                    Удалить
                  </Button>
                </HStack>
              </Stack>
            ))}
          </SimpleGrid>
        )}
    </Stack>
  )
}
