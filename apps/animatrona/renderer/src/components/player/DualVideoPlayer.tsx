'use client'

/**
 * DualVideoPlayer — плеер для визуальной калибровки синхронизации
 *
 * Overlay режим: донор поверх оригинала с opacity 0.5
 * Синхронное воспроизведение с учётом смещения:
 *   donorVideo.currentTime = originalVideo.currentTime + (offset / 1000)
 *
 * Горячие клавиши:
 * - Space: Play/Pause
 * - ←/→: ±10ms смещение
 * - Shift+←/→: ±100ms смещение
 * - Ctrl+←/→: ±1000ms смещение
 * - Home: Сбросить смещение к 0
 */

import { Box, HStack, Icon, IconButton, Slider, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuChevronLeft,
  LuChevronRight,
  LuEye,
  LuEyeOff,
  LuMaximize,
  LuMinimize,
  LuPause,
  LuPlay,
  LuRotateCcw,
  LuVolume2,
  LuVolumeX,
} from 'react-icons/lu'

interface DualVideoPlayerProps {
  /** Путь к оригинальному видео */
  originalPath: string
  /** Путь к видео донора */
  donorPath: string
  /** Текущее смещение в миллисекундах */
  offsetMs: number
  /** Callback при изменении смещения */
  onOffsetChange: (offsetMs: number) => void
  /** Метка оригинала */
  originalLabel?: string
  /** Метка донора */
  donorLabel?: string
}

/**
 * Плеер с overlay режимом для визуальной калибровки синхронизации
 */
export function DualVideoPlayer({
  originalPath,
  donorPath,
  offsetMs,
  onOffsetChange,
  originalLabel = 'Оригинал',
  donorLabel = 'Донор',
}: DualVideoPlayerProps) {
  const originalRef = useRef<HTMLVideoElement>(null)
  const donorRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Состояние плеера
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Overlay настройки
  const [donorOpacity, setDonorOpacity] = useState(0.5)
  const [showDonor, setShowDonor] = useState(true)

  // Конвертация смещения в секунды
  const offsetSec = offsetMs / 1000

  /**
   * Синхронизация времени донора с оригиналом
   * Донор смещён на offsetMs относительно оригинала
   */
  const syncDonorTime = useCallback(
    (originalTime: number) => {
      const donor = donorRef.current
      if (!donor) {
        return
      }

      // Если донор опережает (положительное смещение), нужно показать более ранний кадр донора
      // donorTime = originalTime + offset/1000
      const donorTime = originalTime + offsetSec
      const clampedTime = Math.max(0, Math.min(donor.duration || 0, donorTime))

      if (Math.abs(donor.currentTime - clampedTime) > 0.1) {
        donor.currentTime = clampedTime
      }
    },
    [offsetSec]
  )

  /**
   * Синхронизировать оба видео к заданному времени оригинала
   */
  const syncTime = useCallback(
    (time: number) => {
      const original = originalRef.current
      if (original) {
        original.currentTime = time
      }
      syncDonorTime(time)
      setCurrentTime(time)
    },
    [syncDonorTime]
  )

  // Play/Pause
  const togglePlay = useCallback(() => {
    const original = originalRef.current
    const donor = donorRef.current
    if (!original || !donor) {
      return
    }

    if (isPlaying) {
      original.pause()
      donor.pause()
      setIsPlaying(false)
    } else {
      // Синхронизировать донор перед воспроизведением
      syncDonorTime(original.currentTime)
      original.play()
      donor.play()
      setIsPlaying(true)
    }
  }, [isPlaying, syncDonorTime])

  // Перемотка на N секунд
  const seek = useCallback(
    (delta: number) => {
      const newTime = Math.max(0, Math.min(duration, currentTime + delta))
      syncTime(newTime)
    },
    [currentTime, duration, syncTime]
  )

  // Покадровый шаг
  const stepFrame = useCallback(
    (forward: boolean) => {
      const fps = 24
      const frameDuration = 1 / fps
      seek(forward ? frameDuration : -frameDuration)
    },
    [seek]
  )

  // Изменение смещения
  const adjustOffset = useCallback(
    (deltaMs: number) => {
      onOffsetChange(offsetMs + deltaMs)
    },
    [offsetMs, onOffsetChange]
  )

  // Mute/Unmute
  const toggleMute = useCallback(() => {
    const original = originalRef.current
    if (!original) {
      return
    }

    original.muted = !isMuted
    setIsMuted(!isMuted)
  }, [isMuted])

  // Toggle donor visibility
  const toggleDonor = useCallback(() => {
    setShowDonor((prev) => !prev)
  }, [])

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) {
      return
    }

    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    } else {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    }
  }, [])

  // Обновление времени при воспроизведении
  useEffect(() => {
    const original = originalRef.current
    const donor = donorRef.current
    if (!original || !donor) {
      return
    }

    // Донор всегда замьючен (слушаем только оригинал)
    donor.muted = true
    original.volume = 1

    const handleTimeUpdate = () => {
      setCurrentTime(original.currentTime)
      syncDonorTime(original.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(original.duration || 0)
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    original.addEventListener('timeupdate', handleTimeUpdate)
    original.addEventListener('loadedmetadata', handleLoadedMetadata)
    original.addEventListener('ended', handleEnded)

    return () => {
      original.removeEventListener('timeupdate', handleTimeUpdate)
      original.removeEventListener('loadedmetadata', handleLoadedMetadata)
      original.removeEventListener('ended', handleEnded)
    }
  }, [syncDonorTime])

  // Пересинхронизировать донор при изменении смещения (принудительно)
  useEffect(() => {
    const donor = donorRef.current
    const original = originalRef.current
    if (!donor || !original) {
      return
    }

    // Принудительно обновляем позицию донора при изменении смещения
    const donorTime = original.currentTime + offsetSec
    const clampedTime = Math.max(0, Math.min(donor.duration || 0, donorTime))
    donor.currentTime = clampedTime
  }, [offsetMs, offsetSec])

  // Горячие клавиши
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем если фокус в input
      if (e.target instanceof HTMLInputElement) {
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break

        case 'ArrowLeft':
          e.preventDefault()
          if (e.ctrlKey) {
            adjustOffset(-1000) // ±1000ms
          } else if (e.shiftKey) {
            adjustOffset(-100) // ±100ms
          } else {
            adjustOffset(-10) // ±10ms
          }
          break

        case 'ArrowRight':
          e.preventDefault()
          if (e.ctrlKey) {
            adjustOffset(1000)
          } else if (e.shiftKey) {
            adjustOffset(100)
          } else {
            adjustOffset(10)
          }
          break

        case 'Home':
          e.preventDefault()
          onOffsetChange(0)
          break

        case 'KeyM':
          toggleMute()
          break

        case 'KeyD':
          toggleDonor()
          break

        case 'KeyF':
          toggleFullscreen()
          break

        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen()
          }
          break

        case 'Period': // .
          e.preventDefault()
          stepFrame(true)
          break

        case 'Comma': // ,
          e.preventDefault()
          stepFrame(false)
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, adjustOffset, onOffsetChange, toggleMute, toggleDonor, toggleFullscreen, isFullscreen, stepFrame])

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Форматирование смещения
  const formatOffset = (ms: number) => {
    const sign = ms >= 0 ? '+' : ''
    return `${sign}${ms}ms`
  }

  return (
    <Box
      ref={containerRef}
      position="relative"
      bg="black"
      borderRadius={isFullscreen ? 0 : 'lg'}
      overflow="hidden"
      userSelect="none"
    >
      {/* Контейнер видео */}
      <Box position="relative" aspectRatio="16/9">
        {/* Оригинал (нижний слой) */}
        <video
          ref={originalRef}
          src={originalPath}
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
          playsInline
          muted={isMuted}
        />

        {/* Донор (верхний слой с opacity) */}
        {showDonor && (
          <video
            ref={donorRef}
            src={donorPath}
            style={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              opacity: donorOpacity,
              mixBlendMode: 'lighten',
            }}
            playsInline
            muted
          />
        )}

        {/* Метки */}
        <HStack position="absolute" top={4} left={4} right={4} justify="space-between">
          <Box bg="blackAlpha.700" px={3} py={1} borderRadius="md">
            <Text fontSize="sm" fontWeight="medium" color="white">
              {originalLabel}
            </Text>
          </Box>
          {showDonor && (
            <Box bg="purple.700" px={3} py={1} borderRadius="md" opacity={donorOpacity}>
              <Text fontSize="sm" fontWeight="medium" color="white">
                {donorLabel}
              </Text>
            </Box>
          )}
        </HStack>

        {/* Индикатор смещения */}
        <Box position="absolute" bottom={4} left="50%" transform="translateX(-50%)">
          <Box bg="blackAlpha.800" px={4} py={2} borderRadius="md">
            <Text
              fontSize="lg"
              fontWeight="bold"
              fontFamily="mono"
              color={offsetMs === 0 ? 'gray.400' : offsetMs > 0 ? 'green.400' : 'orange.400'}
            >
              {formatOffset(offsetMs)}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Контролы */}
      <Box px={4} py={3} bg="bg.panel">
        {/* Timeline */}
        <Slider.Root
          value={[currentTime]}
          onValueChange={(details) => {
            syncTime(details.value[0])
          }}
          min={0}
          max={duration || 100}
          step={0.1}
        >
          <Slider.Control mb={3}>
            <Slider.Track>
              <Slider.Range />
            </Slider.Track>
            <Slider.Thumb index={0} />
          </Slider.Control>
        </Slider.Root>

        {/* Кнопки управления */}
        <HStack justify="space-between">
          <HStack gap={2}>
            {/* Play/Pause */}
            <IconButton aria-label={isPlaying ? 'Pause' : 'Play'} onClick={togglePlay} variant="ghost" size="sm">
              <Icon as={isPlaying ? LuPause : LuPlay} />
            </IconButton>

            {/* Время */}
            <Text fontSize="sm" color="fg.muted" fontFamily="mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </Text>

            {/* Покадрово */}
            <IconButton
              aria-label="Step back"
              onClick={() => stepFrame(false)}
              variant="ghost"
              size="sm"
              title=", — кадр назад"
            >
              <Icon as={LuChevronLeft} />
            </IconButton>
            <IconButton
              aria-label="Step forward"
              onClick={() => stepFrame(true)}
              variant="ghost"
              size="sm"
              title=". — кадр вперёд"
            >
              <Icon as={LuChevronRight} />
            </IconButton>
          </HStack>

          <HStack gap={2}>
            {/* Настройка opacity донора */}
            <VStack gap={0} align="center" minW="100px">
              <Text fontSize="xs" color="fg.subtle">
                Прозрачность
              </Text>
              <Slider.Root
                value={[donorOpacity * 100]}
                onValueChange={(details) => setDonorOpacity(details.value[0] / 100)}
                min={10}
                max={90}
                step={5}
                size="sm"
                width="80px"
              >
                <Slider.Control>
                  <Slider.Track>
                    <Slider.Range />
                  </Slider.Track>
                  <Slider.Thumb index={0} />
                </Slider.Control>
              </Slider.Root>
            </VStack>

            {/* Показать/скрыть донор */}
            <IconButton
              aria-label={showDonor ? 'Hide donor' : 'Show donor'}
              onClick={toggleDonor}
              variant="ghost"
              size="sm"
              title="D — показать/скрыть донор"
            >
              <Icon as={showDonor ? LuEye : LuEyeOff} />
            </IconButton>

            {/* Сбросить смещение */}
            <IconButton
              aria-label="Reset offset"
              onClick={() => onOffsetChange(0)}
              variant="ghost"
              size="sm"
              title="Home — сбросить смещение"
            >
              <Icon as={LuRotateCcw} />
            </IconButton>

            {/* Volume */}
            <IconButton
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              onClick={toggleMute}
              variant="ghost"
              size="sm"
              title="M — звук"
            >
              <Icon as={isMuted ? LuVolumeX : LuVolume2} />
            </IconButton>

            {/* Fullscreen */}
            <IconButton
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
              title="F — полноэкранный режим"
            >
              <Icon as={isFullscreen ? LuMinimize : LuMaximize} />
            </IconButton>
          </HStack>
        </HStack>

        {/* Подсказки */}
        <HStack justify="center" mt={2} gap={4} flexWrap="wrap">
          <Text fontSize="xs" color="fg.subtle">
            Space: Play/Pause
          </Text>
          <Text fontSize="xs" color="fg.subtle">
            ←/→: ±10ms
          </Text>
          <Text fontSize="xs" color="fg.subtle">
            Shift+←/→: ±100ms
          </Text>
          <Text fontSize="xs" color="fg.subtle">
            Ctrl+←/→: ±1000ms
          </Text>
          <Text fontSize="xs" color="fg.subtle">
            Home: Сброс
          </Text>
          <Text fontSize="xs" color="fg.subtle">
            , / .: Покадрово
          </Text>
        </HStack>
      </Box>
    </Box>
  )
}
