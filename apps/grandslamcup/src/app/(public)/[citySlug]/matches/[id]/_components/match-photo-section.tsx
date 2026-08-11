'use client'

/**
 * Секция фотографий матча на публичной странице.
 * - Просмотр: все
 * - Загрузка: авторизованные участники обеих команд (проверяется на API)
 * - Удаление: загрузивший + организатор + admin (через deleteMatchPhotoAction)
 */

import { PhotoGallery } from '@/app/_components/photo-gallery'
import { PhotoUploader } from '@/app/_components/photo-uploader'
import { SectionHeading } from '@/app/_components/section-heading'
import { toaster } from '@/app/_components/ui/toaster'
import { useSession } from '@/lib/auth-client'
import { Box, Flex, IconButton, SimpleGrid, Text } from '@chakra-ui/react'
import Image from 'next/image'
import { useState } from 'react'
import { LuTrash2 } from 'react-icons/lu'
import { deleteMatchPhotoAction } from '../_actions/match-organizer.action'

interface PhotoItem {
  id: string
  path: string
  caption: string | null
  width: number | null
  height: number | null
  uploadedById: string | null
}

interface MatchPhotoSectionProps {
  matchId: string
  citySlug: string
  photos: PhotoItem[]
  /** Может ли текущий пользователь загружать фото (участник команды) */
  canUpload: boolean
  /** Может ли текущий пользователь удалять любые фото (организатор/admin) */
  canDeleteAll: boolean
  /** userId текущего пользователя (для сравнения с uploadedById) */
  currentUserId: string | null
}

export function MatchPhotoSection({
  matchId,
  citySlug,
  photos,
  canUpload,
  canDeleteAll,
  currentUserId,
}: MatchPhotoSectionProps) {
  const { data: session } = useSession()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [localPhotos, setLocalPhotos] = useState<PhotoItem[]>(photos)

  async function handleDelete(photoId: string) {
    setDeletingId(photoId)
    try {
      const res = await deleteMatchPhotoAction(photoId, citySlug)
      if (res.success) {
        setLocalPhotos((prev) => prev.filter((p) => p.id !== photoId))
        toaster.success({ title: 'Фото удалено' })
      } else {
        toaster.error({ title: res.error ?? 'Ошибка удаления' })
      }
    } finally {
      setDeletingId(null)
    }
  }

  function canDeletePhoto(photo: PhotoItem): boolean {
    if (!session?.user) { return false }
    if (canDeleteAll) { return true }
    return photo.uploadedById === currentUserId
  }

  return (
    <Box>
      <Flex justify="space-between" align="center" mb={3}>
        <SectionHeading>Фото {localPhotos.length > 0 ? `(${localPhotos.length})` : ''}</SectionHeading>
      </Flex>

      {/* Галерея с кнопками удаления */}
      {localPhotos.length > 0
          && (canDeleteAll || (currentUserId && localPhotos.some((p) => p.uploadedById === currentUserId)))
        ? (
          /* Режим с кнопками удаления — своя сетка вместо PhotoGallery */
          <SimpleGrid columns={{ base: 2, sm: 3, md: 4 }} gap={2} mb={4}>
            {localPhotos.map((photo) => (
              <Box
                key={photo.id}
                position="relative"
                borderRadius="lg"
                overflow="hidden"
                aspectRatio={4 / 3}
                bg="bg.subtle"
              >
                <Image
                  src={`/api/files/${photo.path}`}
                  alt={photo.caption ?? 'Фото матча'}
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                {canDeletePhoto(photo) && (
                  <Box position="absolute" top={1} right={1}>
                    <IconButton
                      size="xs"
                      colorPalette="red"
                      variant="solid"
                      aria-label="Удалить фото"
                      loading={deletingId === photo.id}
                      onClick={() => handleDelete(photo.id)}
                      opacity={0.85}
                      _hover={{ opacity: 1 }}
                    >
                      <LuTrash2 size={12} />
                    </IconButton>
                  </Box>
                )}
                {photo.caption && (
                  <Box position="absolute" bottom={0} left={0} right={0} bg="blackAlpha.600" px={2} py={1}>
                    <Text fontSize="xs" color="white" lineClamp={1}>
                      {photo.caption}
                    </Text>
                  </Box>
                )}
              </Box>
            ))}
          </SimpleGrid>
        )
        : localPhotos.length > 0
        ? (
          /* Обычная галерея без кнопок удаления */
          <Box mb={4}>
            <PhotoGallery photos={localPhotos} />
          </Box>
        )
        : null}

      {/* Загрузчик — только для участников команды */}
      {canUpload && (
        <Box mt={localPhotos.length > 0 ? 4 : 0}>
          <PhotoUploader matchId={matchId} />
        </Box>
      )}

      {/* Подсказка для незалогиненных */}
      {!session?.user && localPhotos.length === 0 && (
        <Text fontSize="sm" color="fg.muted" textAlign="center" py={8}>
          Фотографий пока нет
        </Text>
      )}
    </Box>
  )
}
