'use client'

/**
 * VideoInfoOverlay — информация о видео при нажатии I (как в mpv)
 *
 * Показывает техническую информацию о текущем видео:
 * - Кодек видео/аудио
 * - Разрешение
 * - Битрейт
 * - FPS
 * - Субтитры
 * - Размер файла
 */

import { formatBitrate, formatDuration, formatFileSize } from '@/lib/format-utils'
import { Box, Grid, HStack, Text, VStack } from '@chakra-ui/react'
import { memo } from 'react'
import {
  LuAudioLines,
  LuCaptions,
  LuClock,
  LuFileVideo,
  LuHardDrive,
  LuLayers,
  LuMonitor,
  LuVideo,
} from 'react-icons/lu'

/** Информация о видео для отображения */
export interface VideoInfo {
  /** Путь к файлу */
  filePath?: string
  /** Кодек видео (AV1, HEVC, H.264) */
  videoCodec?: string
  /** Ширина видео */
  videoWidth?: number
  /** Высота видео */
  videoHeight?: number
  /** Битрейт видео (bps) */
  videoBitrate?: number
  /** Битность видео (8, 10, 12) */
  videoBitDepth?: number
  /** FPS видео */
  fps?: number
  /** Кодек аудио */
  audioCodec?: string
  /** Битрейт аудио */
  audioBitrate?: number
  /** Каналы аудио */
  audioChannels?: number
  /** Формат субтитров */
  subtitleFormat?: string
  /** Язык субтитров */
  subtitleLanguage?: string
  /** Размер файла (байты) */
  fileSize?: number
  /** Длительность (секунды) */
  duration?: number
}

interface VideoInfoOverlayProps {
  /** Видимость оверлея */
  isVisible: boolean
  /** Информация о видео */
  info: VideoInfo
}

/** Получение имени файла из пути */
function getFileName(path?: string): string {
  if (!path) {
    return '—'
  }
  const name = path.split(/[/\\]/).pop() || path
  // Обрезаем если слишком длинное
  if (name.length > 50) {
    return name.substring(0, 47) + '...'
  }
  return name
}

/** Строка информации */
function InfoRow({ icon: IconComponent, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <HStack gap={2}>
      <IconComponent color="var(--chakra-colors-fg-subtle)" size={16} />
      <Text color="fg.muted" fontSize="sm" minW="80px">
        {label}:
      </Text>
      <Text color="player.control" fontSize="sm" fontFamily="mono">
        {value}
      </Text>
    </HStack>
  )
}

/**
 * Оверлей с информацией о видео
 */
export const VideoInfoOverlay = memo(function VideoInfoOverlay({ isVisible, info }: VideoInfoOverlayProps) {
  if (!isVisible) {
    return null
  }

  const resolution = info.videoWidth && info.videoHeight ? `${info.videoWidth}×${info.videoHeight}` : '—'

  const audioInfo = [
    info.audioCodec,
    info.audioChannels && `${info.audioChannels}ch`,
    info.audioBitrate && formatBitrate(info.audioBitrate),
  ]
    .filter(Boolean)
    .join(' ')

  const subtitleInfo = [info.subtitleLanguage, info.subtitleFormat].filter(Boolean).join(' ')

  return (
    <Box
      position="absolute"
      top={4}
      left={4}
      bg="blackAlpha.800"
      backdropFilter="blur(8px)"
      borderRadius="lg"
      p={4}
      zIndex={100}
      maxW="400px"
    >
      <VStack align="stretch" gap={2}>
        {/* Заголовок */}
        <Text fontSize="xs" color="fg.subtle" fontWeight="bold" textTransform="uppercase">
          Информация о видео
        </Text>

        {/* Имя файла */}
        <InfoRow icon={LuFileVideo} label="Файл" value={getFileName(info.filePath)} />

        <Grid templateColumns="1fr 1fr" gap={2}>
          {/* Левая колонка */}
          <VStack align="stretch" gap={1}>
            <InfoRow icon={LuVideo} label="Кодек" value={info.videoCodec || '—'} />
            <InfoRow icon={LuMonitor} label="Разрешение" value={resolution} />
            <InfoRow icon={LuLayers} label="Битность" value={info.videoBitDepth ? `${info.videoBitDepth}-bit` : '—'} />
            <InfoRow icon={LuHardDrive} label="Битрейт" value={formatBitrate(info.videoBitrate)} />
          </VStack>

          {/* Правая колонка */}
          <VStack align="stretch" gap={1}>
            <InfoRow icon={LuClock} label="Длительность" value={formatDuration(info.duration)} />
            <InfoRow icon={LuAudioLines} label="Аудио" value={audioInfo || '—'} />
            <InfoRow icon={LuCaptions} label="Субтитры" value={subtitleInfo || '—'} />
            <InfoRow icon={LuFileVideo} label="Размер" value={formatFileSize(info.fileSize)} />
          </VStack>
        </Grid>

        {/* Подсказка */}
        <Text fontSize="xs" color="fg.subtle" textAlign="center" mt={1}>
          Нажмите I для скрытия
        </Text>
      </VStack>
    </Box>
  )
})
