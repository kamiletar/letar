'use client'

/**
 * Секция видео (трейлеры, опенинги, эндинги)
 * Отображает YouTube embed для просмотра видео.
 * Адаптация из animatrona-web VideoSection.
 */

import {
  AspectRatio,
  Badge,
  Box,
  Button,
  Card,
  Dialog,
  Heading,
  HStack,
  Icon,
  Image,
  Portal,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import type { AnimeManifestVideo } from '@letar/animatrona-types'
import { useState } from 'react'
import { LuExternalLink, LuFilm, LuPlay, LuX } from 'react-icons/lu'

interface VideoSectionProps {
  /** Список видео из AnimeManifest */
  videos: AnimeManifestVideo[]
}

/** Локализация типов видео */
const kindLabels: Record<string, { label: string; colorPalette: string }> = {
  OP: { label: 'Опенинг', colorPalette: 'purple' },
  ED: { label: 'Эндинг', colorPalette: 'blue' },
  PV: { label: 'Трейлер', colorPalette: 'red' },
  CM: { label: 'Реклама', colorPalette: 'orange' },
  CLIP: { label: 'Клип', colorPalette: 'green' },
  EPISODE_PREVIEW: { label: 'Превью', colorPalette: 'yellow' },
  OTHER: { label: 'Другое', colorPalette: 'gray' },
}

/** Извлечь YouTube video ID из URL */
function extractYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/,
    /youtube\.com\/v\/([^&?\s]+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) {
      return match[1]
    }
  }

  return null
}

/** Карточка видео */
function VideoCard({ video, onPlay }: { video: AnimeManifestVideo; onPlay: () => void }) {
  const kindInfo = kindLabels[video.kind] || kindLabels.OTHER
  const youtubeId = extractYoutubeId(video.url)
  const thumbnailUrl = video.imageUrl || (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null)

  return (
    <Card.Root
      bg="bg.subtle"
      border="1px"
      borderColor="border.subtle"
      overflow="hidden"
      cursor="pointer"
      transition="all 0.15s ease-out"
      _hover={{ borderColor: 'purple.500', transform: 'scale(1.02)' }}
      _active={{ transform: 'scale(0.98)', borderColor: 'purple.600' }}
      onClick={onPlay}
    >
      <AspectRatio ratio={16 / 9}>
        <Box position="relative">
          {thumbnailUrl ? (
            <Image src={thumbnailUrl} alt={video.name || 'Video'} objectFit="cover" />
          ) : (
            <Box bg="bg.subtle" display="flex" alignItems="center" justifyContent="center">
              <Icon as={LuFilm} boxSize={12} color="fg.subtle" />
            </Box>
          )}

          {/* Оверлей с кнопкой play */}
          <Box
            position="absolute"
            inset={0}
            bg="blackAlpha.600"
            display="flex"
            alignItems="center"
            justifyContent="center"
            opacity={0}
            transition="opacity 0.2s"
            _groupHover={{ opacity: 1 }}
          >
            <Icon as={LuPlay} boxSize={12} color="white" />
          </Box>

          {/* Бейдж типа */}
          <Badge position="absolute" top={2} left={2} colorPalette={kindInfo!.colorPalette} size="sm">
            {kindInfo!.label}
          </Badge>
        </Box>
      </AspectRatio>

      <Card.Body py={2} px={3}>
        <Text fontSize="sm" fontWeight="medium" lineClamp={1} title={video.name || undefined}>
          {video.name || kindInfo!.label}
        </Text>
      </Card.Body>
    </Card.Root>
  )
}

/** Диалог с YouTube плеером */
function VideoPlayerDialog({
  video,
  open,
  onClose,
}: {
  video: AnimeManifestVideo | null
  open: boolean
  onClose: () => void
}) {
  if (!video) {
    return null
  }

  const youtubeId = extractYoutubeId(video.url)
  const kindInfo = kindLabels[video.kind] || kindLabels.OTHER
  const embedUrl = youtubeId ? `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0` : null

  return (
    <Dialog.Root open={open} onOpenChange={(e) => !e.open && onClose()} size="xl">
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content bg="bg.panel" maxW="900px">
            <Dialog.Header borderBottom="1px" borderColor="border.subtle">
              <HStack justify="space-between" w="full">
                <HStack gap={3}>
                  <Badge colorPalette={kindInfo!.colorPalette}>{kindInfo!.label}</Badge>
                  <Dialog.Title>{video.name || kindInfo!.label}</Dialog.Title>
                </HStack>
                <HStack gap={2}>
                  <a href={video.url} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost">
                      <Icon as={LuExternalLink} mr={1} />
                      YouTube
                    </Button>
                  </a>
                  <Dialog.CloseTrigger asChild>
                    <Button size="sm" variant="ghost">
                      <Icon as={LuX} />
                    </Button>
                  </Dialog.CloseTrigger>
                </HStack>
              </HStack>
            </Dialog.Header>

            <Dialog.Body p={0}>
              {embedUrl ? (
                <AspectRatio ratio={16 / 9}>
                  <iframe
                    src={embedUrl}
                    title={video.name || 'Video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ border: 'none' }}
                  />
                </AspectRatio>
              ) : (
                <VStack py={12} gap={4}>
                  <Icon as={LuFilm} boxSize={16} color="fg.subtle" />
                  <Text color="fg.muted">Видео недоступно для embed</Text>
                  <a href={video.url} target="_blank" rel="noopener noreferrer">
                    <Button colorPalette="purple">
                      <Icon as={LuExternalLink} mr={2} />
                      Открыть в браузере
                    </Button>
                  </a>
                </VStack>
              )}
            </Dialog.Body>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}

/** Группа видео одного типа */
function VideoGroup({
  title,
  videos,
  onPlay,
}: {
  title: string
  videos: AnimeManifestVideo[]
  onPlay: (v: AnimeManifestVideo) => void
}) {
  if (videos.length === 0) {
    return null
  }

  return (
    <Box>
      <Text fontSize="sm" color="fg.muted" mb={3}>
        {title}
      </Text>
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} gap={3}>
        {videos.map((video, index) => (
          <Box key={`${video.kind}-${video.url}-${index}`} role="group">
            <VideoCard video={video} onPlay={() => onPlay(video)} />
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  )
}

export function VideoSection({ videos }: VideoSectionProps) {
  const [selectedVideo, setSelectedVideo] = useState<AnimeManifestVideo | null>(null)

  if (!videos || videos.length === 0) {
    return null
  }

  // Группируем видео по типу
  const trailers = videos.filter((v) => v.kind === 'PV' || v.kind === 'CM')
  const openings = videos.filter((v) => v.kind === 'OP')
  const endings = videos.filter((v) => v.kind === 'ED')
  const other = videos.filter((v) => !['PV', 'CM', 'OP', 'ED'].includes(v.kind))

  return (
    <>
      <Card.Root bg="bg.panel" border="1px" borderColor="border.subtle">
        <Card.Body>
          <VStack gap={6} align="stretch">
            <HStack>
              <Icon as={LuFilm} color="fg.muted" />
              <Heading size="md">Видео</Heading>
              <Badge colorPalette="gray" variant="subtle">
                {videos.length}
              </Badge>
            </HStack>

            <VideoGroup title="Трейлеры" videos={trailers} onPlay={setSelectedVideo} />
            <VideoGroup title="Опенинги" videos={openings} onPlay={setSelectedVideo} />
            <VideoGroup title="Эндинги" videos={endings} onPlay={setSelectedVideo} />
            <VideoGroup title="Другое" videos={other} onPlay={setSelectedVideo} />
          </VStack>
        </Card.Body>
      </Card.Root>

      <VideoPlayerDialog video={selectedVideo} open={!!selectedVideo} onClose={() => setSelectedVideo(null)} />
    </>
  )
}
