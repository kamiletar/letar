'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { deleteAlbumAction, toggleAlbumPublishAction } from '@/app/my/poems/_actions/album.action'
import type { AlbumListItem } from '@/app/my/poems/_types/album.types'
import { Badge, Box, Grid, HStack, IconButton, Image, Text, VStack } from '@chakra-ui/react'
import Link from 'next/link'
import { useState } from 'react'
import { LuBookOpen, LuEye, LuEyeOff, LuPencil, LuTrash2 } from 'react-icons/lu'

interface AlbumsListProps {
  albums: AlbumListItem[]
}

export function AlbumsList({ albums }: AlbumsListProps) {
  const [items, setItems] = useState(albums)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleTogglePublish = async (albumId: string) => {
    setLoadingId(albumId)
    try {
      const result = await toggleAlbumPublishAction(albumId)
      if ('error' in result && result.error) {
        toaster.error({ title: typeof result.error === 'string' ? result.error : 'Ошибка' })
        return
      }
      setItems((prev) =>
        prev.map((a) =>
          a.id === albumId ? { ...a, publishedAt: 'data' in result && result.data ? result.data.publishedAt : null } : a
        )
      )
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (albumId: string, title: string) => {
    if (!confirm(`Удалить альбом «${title}»? Стихи останутся.`)) {
      return
    }
    setLoadingId(albumId)
    try {
      const result = await deleteAlbumAction(albumId)
      if ('error' in result && result.error) {
        toaster.error({ title: typeof result.error === 'string' ? result.error : 'Ошибка' })
        return
      }
      setItems((prev) => prev.filter((a) => a.id !== albumId))
      toaster.success({ title: 'Альбом удалён' })
    } finally {
      setLoadingId(null)
    }
  }

  if (items.length === 0) {
    return (
      <Text color="fg.muted" py={8} textAlign="center">
        У вас пока нет альбомов
      </Text>
    )
  }

  return (
    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
      {items.map((album) => {
        const isPublished = !!album.publishedAt
        const loading = loadingId === album.id

        return (
          <Box
            key={album.id}
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="xl"
            overflow="hidden"
            opacity={loading ? 0.6 : 1}
            transition="opacity 0.15s"
          >
            {/* Обложка */}
            <Box h={32} bg="brand.950" position="relative">
              {album.coverImage
                ? (
                  <Image
                    src={album.coverImage.startsWith('http') ? album.coverImage : `/api/files/${album.coverImage}`}
                    alt={album.title}
                    w="full"
                    h="full"
                    objectFit="cover"
                  />
                )
                : (
                  <Box display="flex" alignItems="center" justifyContent="center" h="full" color="brand.600">
                    <LuBookOpen size={36} />
                  </Box>
                )}
            </Box>

            {/* Информация */}
            <VStack align="start" gap={2} p={3}>
              <HStack justify="space-between" w="full">
                <Text fontWeight="semibold" lineClamp={1} flex={1}>
                  {album.title}
                </Text>
                <Badge colorPalette={isPublished ? 'green' : 'gray'} size="sm">
                  {isPublished ? 'Опубликован' : 'Черновик'}
                </Badge>
              </HStack>

              <Text fontSize="xs" color="fg.muted">
                {album._count.albumPoems} {album._count.albumPoems === 1
                  ? 'стихотворение'
                  : album._count.albumPoems < 5
                  ? 'стихотворения'
                  : 'стихотворений'}
              </Text>

              <HStack gap={1} w="full" justify="flex-end">
                <IconButton
                  aria-label={isPublished ? 'Снять с публикации' : 'Опубликовать'}
                  size="sm"
                  variant="ghost"
                  colorPalette={isPublished ? 'orange' : 'green'}
                  onClick={() => handleTogglePublish(album.id)}
                  disabled={loading}
                >
                  {isPublished ? <LuEyeOff /> : <LuEye />}
                </IconButton>
                <Link href={`/my/poems/albums/${album.id}/edit`}>
                  <IconButton aria-label="Редактировать" size="sm" variant="ghost" disabled={loading} asChild>
                    <span>
                      <LuPencil />
                    </span>
                  </IconButton>
                </Link>
                <IconButton
                  aria-label="Удалить"
                  size="sm"
                  variant="ghost"
                  colorPalette="red"
                  onClick={() => handleDelete(album.id, album.title)}
                  disabled={loading}
                >
                  <LuTrash2 />
                </IconButton>
              </HStack>
            </VStack>
          </Box>
        )
      })}
    </Grid>
  )
}
