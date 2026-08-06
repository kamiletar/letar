'use client'

/**
 * MiniPlayer — глобальный мини-плеер
 *
 * Показывается когда пользователь уходит со страницы просмотра
 * во время воспроизведения видео (как YouTube mini-player).
 *
 * Функции:
 * - Продолжает воспроизведение при навигации
 * - Позволяет развернуть и вернуться к полному плееру
 * - Поддерживает нативный Picture-in-Picture
 * - Можно закрыть (остановить воспроизведение)
 */

import { Box, Image, Text, VStack } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useGlobalVideoStore } from '@/components/global-video'
import { toMediaUrl } from '@/lib/media-url'

import { MiniPlayerControls } from './MiniPlayerControls'
import { useMiniPlayerProgress } from './useMiniPlayerProgress'

/** Размеры mini-player */
const MINI_PLAYER_WIDTH = 320
const MINI_PLAYER_HEIGHT = 180

/** Motion-обёртка для Box */
const MotionBox = motion.create(Box)

/**
 * MiniPlayer компонент
 * Рендерится в layout.tsx, показывается при mode === 'mini'
 */
export function MiniPlayer() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [showControls, setShowControls] = useState(false)

  // Состояние из store
  const mode = useGlobalVideoStore((s) => s.mode)
  const metadata = useGlobalVideoStore((s) => s.metadata)
  const currentTime = useGlobalVideoStore((s) => s.currentTime)
  const duration = useGlobalVideoStore((s) => s.duration)
  const isPlaying = useGlobalVideoStore((s) => s.isPlaying)
  const videoElement = useGlobalVideoStore((s) => s.videoElement)

  // Actions из store
  const expand = useGlobalVideoStore((s) => s.expand)
  const close = useGlobalVideoStore((s) => s.close)
  const updatePlayingState = useGlobalVideoStore((s) => s.updatePlayingState)

  // Сохранение прогресса в БД при воспроизведении в mini mode
  useMiniPlayerProgress()

  // Показывать mini-player только в режиме 'mini'
  const isVisible = mode === 'mini'

  // Перемещаем video element в контейнер mini-player
  useEffect(() => {
    if (!isVisible || !videoElement || !containerRef.current) {
      return
    }

    const container = containerRef.current

    // Сохраняем текущий родитель для восстановления
    const originalParent = videoElement.parentElement

    // Перемещаем video в mini-player контейнер
    container.appendChild(videoElement)

    // Стили для video element в mini-player
    videoElement.style.width = '100%'
    videoElement.style.height = '100%'
    videoElement.style.objectFit = 'contain'

    return () => {
      // При размонтировании возвращаем video обратно (если ещё существует)
      if (originalParent && videoElement.parentElement === container) {
        originalParent.appendChild(videoElement)
      }
    }
  }, [isVisible, videoElement])

  // Toggle play/pause
  const handleTogglePlay = useCallback(() => {
    if (!videoElement) {
      return
    }
    if (videoElement.paused) {
      videoElement.play()
      updatePlayingState(true)
    } else {
      videoElement.pause()
      updatePlayingState(false)
    }
  }, [videoElement, updatePlayingState])

  // Развернуть и вернуться на страницу просмотра
  const handleExpand = useCallback(() => {
    const returnPath = expand()
    if (returnPath) {
      router.push(returnPath)
    }
  }, [expand, router])

  // Переключить Picture-in-Picture
  const handleTogglePiP = useCallback(async () => {
    if (!videoElement) {
      return
    }
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      } else if (document.pictureInPictureEnabled) {
        await videoElement.requestPictureInPicture()
      }
    } catch (error) {
      console.warn('[MiniPlayer] PiP error:', error)
    }
  }, [videoElement])

  // Перемотка видео (seekbar)
  const handleSeek = useCallback(
    (time: number) => {
      if (videoElement && isFinite(time)) {
        videoElement.currentTime = time
      }
    },
    [videoElement],
  )

  // Закрыть mini-player
  const handleClose = useCallback(() => {
    close()
  }, [close])

  // Получаем URL постера (локальный файл)
  const posterUrl = metadata?.posterPath ? toMediaUrl(metadata.posterPath) : null

  return (
    <AnimatePresence>
      {isVisible && (
        <MotionBox
          position="fixed"
          bottom={4}
          right={4}
          zIndex={1000}
          width={`${MINI_PLAYER_WIDTH}px`}
          height={`${MINI_PLAYER_HEIGHT}px`}
          borderRadius="lg"
          overflow="hidden"
          shadow="2xl"
          bg="black"
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >
          {/* Контейнер для video element */}
          <Box ref={containerRef} position="absolute" inset={0} bg="black" />

          {/* Фоновый постер (показывается пока нет видео или при загрузке) */}
          {posterUrl && !videoElement && (
            <Image
              src={posterUrl}
              alt={metadata?.animeName || 'Poster'}
              position="absolute"
              inset={0}
              objectFit="cover"
              opacity={0.5}
            />
          )}

          {/* Инфо-бар внизу (всегда видимый) */}
          <Box
            position="absolute"
            bottom={0}
            left={0}
            right={0}
            bg="linear-gradient(transparent, rgba(0,0,0,0.9))"
            pt={6}
            pb={2}
            px={2}
            pointerEvents="none"
          >
            <VStack gap={0} align="start">
              <Text color="white" fontSize="xs" fontWeight="medium" lineClamp={1}>
                {metadata?.animeName}
              </Text>
              <Text color="whiteAlpha.700" fontSize="xs" lineClamp={1}>
                {metadata?.seasonNumber ? `S${metadata.seasonNumber} ` : ''}E{metadata?.episodeNumber}
                {metadata?.episodeName ? ` — ${metadata.episodeName}` : ''}
              </Text>
            </VStack>
          </Box>

          {/* Контролы (при наведении) */}
          <MiniPlayerControls
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            onTogglePlay={handleTogglePlay}
            onExpand={handleExpand}
            onTogglePiP={handleTogglePiP}
            onClose={handleClose}
            onSeek={handleSeek}
            isVisible={showControls}
          />
        </MotionBox>
      )}
    </AnimatePresence>
  )
}
