'use client'

/**
 * Галерея фотографий матча.
 * Responsive сетка + lightbox при клике.
 */

import { toaster } from '@/app/_components/ui/toaster'
import { getPhotoUrl } from '@/lib/images'
import { Box, Button, Dialog, Flex, Grid, Portal, Text } from '@chakra-ui/react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { LuChevronLeft, LuChevronRight, LuTrash2, LuX } from 'react-icons/lu'

interface Photo {
  id: string
  path: string
  caption?: string | null
  width?: number | null
  height?: number | null
}

interface PhotoGalleryProps {
  photos: Photo[]
  /** Показать кнопку удаления (только для админа) */
  canDelete?: boolean
  /** Action для удаления */
  onDelete?: (photoId: string) => Promise<{ success?: boolean; error?: string }>
}

export function PhotoGallery({ photos, canDelete, onDelete }: PhotoGalleryProps) {
  const router = useRouter()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  if (photos.length === 0) {
    return null
  }

  const handleDelete = async (photoId: string) => {
    if (!onDelete) {
      return
    }
    setDeleting(photoId)
    try {
      const result = await onDelete(photoId)
      if (result.error) {
        toaster.error({ title: result.error })
      } else {
        toaster.success({ title: 'Фото удалено' })
        router.refresh()
        setLightboxIndex(null)
      }
    } finally {
      setDeleting(null)
    }
  }

  const currentPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null

  const goPrev = () => {
    if (lightboxIndex === null) {
      return
    }
    setLightboxIndex(lightboxIndex > 0 ? lightboxIndex - 1 : photos.length - 1)
  }

  const goNext = () => {
    if (lightboxIndex === null) {
      return
    }
    setLightboxIndex(lightboxIndex < photos.length - 1 ? lightboxIndex + 1 : 0)
  }

  return (
    <>
      {/* Сетка */}
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }} gap={3}>
        {photos.map((photo, idx) => (
          <Box
            key={photo.id}
            borderRadius="lg"
            overflow="hidden"
            cursor="pointer"
            position="relative"
            bg="bg.subtle"
            _hover={{ opacity: 0.9 }}
            transition="opacity 0.15s"
            onClick={() => setLightboxIndex(idx)}
          >
            <Box position="relative" pt="75%">
              <Image
                src={getPhotoUrl(photo.path)}
                alt={photo.caption || 'Фото матча'}
                fill
                sizes="(max-width: 768px) 50vw, 25vw"
                style={{ objectFit: 'cover' }}
              />
            </Box>
            {photo.caption && (
              <Text fontSize="xs" color="fg.muted" p={2} lineClamp={1}>
                {photo.caption}
              </Text>
            )}
          </Box>
        ))}
      </Grid>

      {/* Lightbox */}
      <Dialog.Root open={lightboxIndex !== null} onOpenChange={(e) => !e.open && setLightboxIndex(null)}>
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.900" />
          <Dialog.Positioner>
            <Dialog.Content bg="transparent" shadow="none" maxW="90vw" maxH="90vh">
              <Dialog.Body p={0} position="relative">
                {currentPhoto && (
                  <Flex direction="column" align="center" gap={3}>
                    {/* Изображение — blob/внешний URL, Next.js Image не подходит */}
                    <Box position="relative" maxH="80vh" maxW="90vw">
                      {}
                      {/* oxlint-disable-next-line nextjs/no-img-element -- blob URL, unoptimized */}
                      <img
                        src={getPhotoUrl(currentPhoto.path)}
                        alt={currentPhoto.caption || 'Фото матча'}
                        style={{
                          maxHeight: '80vh',
                          maxWidth: '90vw',
                          objectFit: 'contain',
                          borderRadius: '8px',
                        }}
                      />
                    </Box>

                    {/* Подпись + управление */}
                    <Flex gap={3} align="center" justify="center" wrap="wrap">
                      {currentPhoto.caption && (
                        <Text color="white" fontSize="sm" textAlign="center">
                          {currentPhoto.caption}
                        </Text>
                      )}
                      <Text color="whiteAlpha.600" fontSize="xs">
                        {(lightboxIndex ?? 0) + 1} / {photos.length}
                      </Text>
                    </Flex>

                    {/* Кнопки навигации */}
                    {photos.length > 1 && (
                      <>
                        <Button
                          position="absolute"
                          left={-12}
                          top="50%"
                          transform="translateY(-50%)"
                          variant="ghost"
                          color="white"
                          onClick={(e) => {
                            e.stopPropagation()
                            goPrev()
                          }}
                          size="lg"
                        >
                          <LuChevronLeft size={24} />
                        </Button>
                        <Button
                          position="absolute"
                          right={-12}
                          top="50%"
                          transform="translateY(-50%)"
                          variant="ghost"
                          color="white"
                          onClick={(e) => {
                            e.stopPropagation()
                            goNext()
                          }}
                          size="lg"
                        >
                          <LuChevronRight size={24} />
                        </Button>
                      </>
                    )}

                    {/* Кнопки закрытия + удаления */}
                    <Flex position="absolute" top={-10} right={0} gap={2}>
                      {canDelete && onDelete && (
                        <Button
                          size="sm"
                          colorPalette="red"
                          variant="ghost"
                          color="white"
                          loading={deleting === currentPhoto.id}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(currentPhoto.id)
                          }}
                        >
                          <LuTrash2 size={16} />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" color="white" onClick={() => setLightboxIndex(null)}>
                        <LuX size={16} />
                      </Button>
                    </Flex>
                  </Flex>
                )}
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
