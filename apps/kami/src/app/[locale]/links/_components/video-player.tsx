'use client'

import { AspectRatio, Box } from '@chakra-ui/react'

interface VideoPlayerProps {
  source: 'URL' | 'FILE'
  /** Для source=URL — embedUrl провайдера (youtube/vimeo iframe src) */
  embedUrl?: string | null
  /** Для source=FILE — путь раздачи файла (/api/videos/<path>) */
  fileSrc?: string | null
  mimeType?: string | null
  title: string
}

/**
 * Встроенный видеоплеер карточки — iframe-embed для распознанных провайдеров (YouTube/Vimeo),
 * либо нативный `<video controls>` для расшаренных файлов (отдаются `/api/videos/[...path]`
 * с поддержкой Range-запросов, см. `@letar/image-upload/server`).
 */
export function VideoPlayer({ source, embedUrl, fileSrc, mimeType, title }: VideoPlayerProps) {
  if (source === 'URL' && embedUrl) {
    return (
      <AspectRatio ratio={16 / 9} borderRadius="md" overflow="hidden">
        <Box asChild>
          <iframe src={embedUrl} title={title} allow="fullscreen" allowFullScreen />
        </Box>
      </AspectRatio>
    )
  }

  if (source === 'FILE' && fileSrc) {
    return (
      <AspectRatio ratio={16 / 9} borderRadius="md" overflow="hidden" bg="black">
        <video controls preload="metadata" src={fileSrc}>
          {mimeType}
        </video>
      </AspectRatio>
    )
  }

  return null
}
