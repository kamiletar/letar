'use client'

/**
 * VideoInfo — оверлей с технической информацией о видео
 *
 * Показывается по нажатию клавиши I
 */

import { Box, Text, VStack } from '@chakra-ui/react'
import type { EpisodeManifest } from '@letar/animatrona-types'

export interface VideoInfoProps {
  /** Показывать ли оверлей */
  visible: boolean
  /** Манифест эпизода */
  manifest: EpisodeManifest
  /** Текущее время (секунды) */
  currentTime: number
  /** Текущая аудиодорожка */
  audioTrackIndex: number
  /** Скорость воспроизведения */
  playbackRate: number
}

/** Панель технической информации о видео (кодек, разрешение, битрейт) */
export function VideoInfo({ visible, manifest, currentTime, audioTrackIndex, playbackRate }: VideoInfoProps) {
  if (!visible) {
    return null
  }

  const audio = manifest.audioTracks[audioTrackIndex]

  return (
    <Box
      position="absolute"
      top={4}
      left={4}
      bg="blackAlpha.800"
      borderRadius="md"
      px={4}
      py={3}
      zIndex={15}
      backdropFilter="blur(4px)"
      maxW="400px"
    >
      <VStack align="start" gap={1}>
        <Text color="white" fontSize="sm" fontWeight="bold">
          {manifest.info.animeName} — Эпизод {manifest.info.episodeNumber}
        </Text>
        <Text color="gray.300" fontSize="xs">
          Видео: {manifest.video.codec} · {manifest.video.width}x{manifest.video.height}
          {manifest.video.bitrate && ` · ${Math.round(manifest.video.bitrate / 1000)}kbps`}
        </Text>
        {audio && (
          <Text color="gray.300" fontSize="xs">
            Аудио: {audio.title} · {audio.codec} {audio.channels}
            {audio.bitrate && ` · ${Math.round(audio.bitrate / 1000)}kbps`}
          </Text>
        )}
        {manifest.encoding && (
          <Text color="gray.300" fontSize="xs">
            Кодирование: {manifest.encoding.profileName} · {manifest.encoding.preset} · CQ{manifest.encoding.cq}
          </Text>
        )}
        <Text color="gray.300" fontSize="xs">
          Позиция: {Math.floor(currentTime)}с · Скорость: {playbackRate}x
        </Text>
      </VStack>
    </Box>
  )
}
