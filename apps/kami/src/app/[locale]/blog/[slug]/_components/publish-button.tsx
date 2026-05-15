'use client'

import { getEnabledPlatforms, getPostPublications, publishPost } from '@/app/_actions/crosspost.action'
import { Badge, Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { Share2 } from 'lucide-react'
import { useEffect, useState, useTransition } from 'react'

interface PublishButtonProps {
  slug: string
  isAdmin: boolean
}

interface Platform {
  id: string
  type: string
  name: string
}

interface Publication {
  id: string
  status: string
  externalUrl: string | null
  platform: Platform
}

/**
 * Кнопка публикации блог-поста в соцсети (только для админов)
 */
export function PublishButton({ slug, isAdmin }: PublishButtonProps) {
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [publications, setPublications] = useState<Publication[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!isAdmin) {
      return
    }
    // Загружаем платформы и существующие публикации
    void getEnabledPlatforms().then(setPlatforms)
    void getPostPublications(slug).then((pubs) => setPublications(pubs as Publication[]))
  }, [slug, isAdmin])

  if (!isAdmin || platforms.length === 0) {
    return null
  }

  const handlePublish = (platformIds: string[]) => {
    startTransition(async () => {
      const result = await publishPost(slug, platformIds)
      if (result.success) {
        // Обновляем публикации
        const pubs = await getPostPublications(slug)
        setPublications(pubs as Publication[])
        setIsOpen(false)
      }
    })
  }

  const publishedPlatformIds = new Set(publications.filter((p) => p.status === 'PUBLISHED').map((p) => p.platform.id))

  const unpublishedPlatforms = platforms.filter((p) => !publishedPlatformIds.has(p.id))

  return (
    <Box position="relative">
      <Button variant="outline" size="sm" onClick={() => setIsOpen(!isOpen)}>
        <Share2 size={16} />
        <Text ml={2}>Опубликовать в соцсети</Text>
      </Button>

      {isOpen && (
        <Box
          position="absolute"
          top="100%"
          right={0}
          mt={2}
          p={4}
          bg={{ base: 'white', _dark: 'gray.800' }}
          borderWidth="1px"
          borderRadius="md"
          shadow="lg"
          zIndex={10}
          minW="280px"
        >
          <VStack gap={3} align="stretch">
            {/* Уже опубликованные */}
            {publications.length > 0 && (
              <VStack gap={1} align="stretch">
                <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
                  Опубликовано
                </Text>
                {publications.map((pub) => (
                  <HStack key={pub.id} justify="space-between">
                    <Text fontSize="sm">{pub.platform.name}</Text>
                    <Badge variant="subtle" colorPalette={pub.status === 'PUBLISHED' ? 'green' : 'red'} fontSize="xs">
                      {pub.status === 'PUBLISHED' ? 'OK' : 'Ошибка'}
                    </Badge>
                  </HStack>
                ))}
              </VStack>
            )}

            {/* Кнопки публикации */}
            {unpublishedPlatforms.length > 0 ? (
              <>
                <Text fontSize="xs" fontWeight="semibold" color="fg.muted">
                  Опубликовать в
                </Text>
                {unpublishedPlatforms.map((platform) => (
                  <Button
                    key={platform.id}
                    size="sm"
                    variant="outline"
                    onClick={() => handlePublish([platform.id])}
                    disabled={isPending}
                  >
                    {platform.name}
                  </Button>
                ))}
                <Button
                  size="sm"
                  colorPalette="green"
                  onClick={() => handlePublish(unpublishedPlatforms.map((p) => p.id))}
                  disabled={isPending}
                >
                  {isPending ? 'Публикация...' : 'Во все сразу'}
                </Button>
              </>
            ) : (
              <Text fontSize="sm" color="fg.muted">
                Опубликовано везде
              </Text>
            )}
          </VStack>
        </Box>
      )}
    </Box>
  )
}
