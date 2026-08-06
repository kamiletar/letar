'use client'

import { Box, Button, HStack, Icon, IconButton, Slider, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuArrowLeftRight,
  LuChevronLeft,
  LuChevronRight,
  LuMaximize,
  LuMinimize,
  LuPause,
  LuPlay,
  LuVolume2,
  LuVolumeX,
} from 'react-icons/lu'

interface ComparePlayerProps {
  /** Путь к первому видео */
  videoA: string
  /** Путь к второму видео */
  videoB: string
  /** Метка первого видео */
  labelA?: string
  /** Метка второго видео */
  labelB?: string
  /** Callback при закрытии */
  onClose?: () => void
}

/**
 * Split-screen плеер для сравнения двух видео
 * Синхронизирует воспроизведение, позволяет перетаскивать разделитель
 */
export function ComparePlayer({ videoA, videoB, labelA, labelB, onClose: _onClose }: ComparePlayerProps) {
  const videoRefA = useRef<HTMLVideoElement>(null)
  const videoRefB = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const dividerRef = useRef<HTMLDivElement>(null)

  // Состояние плеера
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [volume] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Позиция разделителя (0-100%)
  const [splitPosition, setSplitPosition] = useState(50)
  const [isDragging, setIsDragging] = useState(false)

  // Какое видео показывает аудио (A или B)
  const [audioSource, setAudioSource] = useState<'A' | 'B'>('A')

  // Синхронизация времени
  const syncTime = useCallback((time: number) => {
    if (videoRefA.current) {
      videoRefA.current.currentTime = time
    }
    if (videoRefB.current) {
      videoRefB.current.currentTime = time
    }
  }, [])

  // Play/Pause
  const togglePlay = useCallback(() => {
    const vA = videoRefA.current
    const vB = videoRefB.current
    if (!vA || !vB) {
      return
    }

    if (isPlaying) {
      vA.pause()
      vB.pause()
      setIsPlaying(false)
    } else {
      vA.play()
      vB.play()
      setIsPlaying(true)
    }
  }, [isPlaying])

  // Перемотка на N секунд
  const seek = useCallback(
    (delta: number) => {
      const newTime = Math.max(0, Math.min(duration, currentTime + delta))
      syncTime(newTime)
      setCurrentTime(newTime)
    },
    [currentTime, duration, syncTime],
  )

  // Покадровый шаг
  const stepFrame = useCallback(
    (forward: boolean) => {
      const fps = 24 // Предполагаем 24 fps
      const frameDuration = 1 / fps
      seek(forward ? frameDuration : -frameDuration)
    },
    [seek],
  )

  // Mute/Unmute
  const toggleMute = useCallback(() => {
    const vA = videoRefA.current
    const vB = videoRefB.current
    if (!vA || !vB) {
      return
    }

    const newMuted = !isMuted
    vA.muted = true // Видео A всегда замьючено
    vB.muted = audioSource === 'A' || newMuted
    if (audioSource === 'A') {
      vA.muted = newMuted
    }
    setIsMuted(newMuted)
  }, [isMuted, audioSource])

  // Swap видео (поменять местами)
  const swapVideos = useCallback(() => {
    setAudioSource((prev) => (prev === 'A' ? 'B' : 'A'))
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

  // Обработчик перетаскивания разделителя
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  // Обработчик перемещения мыши
  useEffect(() => {
    if (!isDragging) {
      return
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) {
        return
      }

      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const percentage = (x / rect.width) * 100
      setSplitPosition(Math.max(10, Math.min(90, percentage)))
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging])

  // Синхронизация и обновление времени
  useEffect(() => {
    const vA = videoRefA.current
    const vB = videoRefB.current
    if (!vA || !vB) {
      return
    }

    // Настройка аудио
    vA.muted = audioSource !== 'A' || isMuted
    vB.muted = audioSource !== 'B' || isMuted
    vA.volume = volume
    vB.volume = volume

    const handleTimeUpdate = () => {
      setCurrentTime(vA.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(Math.max(vA.duration || 0, vB.duration || 0))
    }

    const handleEnded = () => {
      setIsPlaying(false)
    }

    vA.addEventListener('timeupdate', handleTimeUpdate)
    vA.addEventListener('loadedmetadata', handleLoadedMetadata)
    vA.addEventListener('ended', handleEnded)

    return () => {
      vA.removeEventListener('timeupdate', handleTimeUpdate)
      vA.removeEventListener('loadedmetadata', handleLoadedMetadata)
      vA.removeEventListener('ended', handleEnded)
    }
  }, [audioSource, isMuted, volume])

  // Горячие клавиши
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'Space':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (e.shiftKey) {
            stepFrame(false)
          } else {
            seek(-5)
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (e.shiftKey) {
            stepFrame(true)
          } else {
            seek(5)
          }
          break
        case 'KeyM':
          toggleMute()
          break
        case 'KeyS':
          swapVideos()
          break
        case 'KeyF':
          toggleFullscreen()
          break
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [togglePlay, seek, stepFrame, toggleMute, swapVideos, toggleFullscreen, isFullscreen])

  // Форматирование времени
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
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
        {/* Видео A (левая часть) */}
        <Box
          position="absolute"
          inset={0}
          overflow="hidden"
          style={{
            clipPath: `inset(0 ${100 - splitPosition}% 0 0)`,
          }}
        >
          <video
            ref={videoRefA}
            src={videoA}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
            playsInline
          />
          {/* Метка A */}
          {labelA && (
            <Box position="absolute" top={4} left={4} bg="blackAlpha.700" px={3} py={1} borderRadius="md">
              <Text fontSize="sm" fontWeight="medium" color="player.control">
                {labelA}
              </Text>
            </Box>
          )}
        </Box>

        {/* Видео B (правая часть) */}
        <Box
          position="absolute"
          inset={0}
          overflow="hidden"
          style={{
            clipPath: `inset(0 0 0 ${splitPosition}%)`,
          }}
        >
          <video
            ref={videoRefB}
            src={videoB}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
            playsInline
          />
          {/* Метка B */}
          {labelB && (
            <Box position="absolute" top={4} right={4} bg="blackAlpha.700" px={3} py={1} borderRadius="md">
              <Text fontSize="sm" fontWeight="medium" color="player.control">
                {labelB}
              </Text>
            </Box>
          )}
        </Box>

        {/* Разделитель */}
        <Box
          ref={dividerRef}
          position="absolute"
          top={0}
          bottom={0}
          w="4px"
          bg="purple.500"
          cursor="ew-resize"
          style={{
            left: `${splitPosition}%`,
            transform: 'translateX(-50%)',
          }}
          onMouseDown={handleDividerMouseDown}
          _hover={{ bg: 'purple.400' }}
          _active={{ bg: 'purple.300' }}
        >
          {/* Ручка разделителя */}
          <Box
            position="absolute"
            top="50%"
            left="50%"
            transform="translate(-50%, -50%)"
            w={6}
            h={10}
            bg="purple.500"
            borderRadius="md"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon as={LuArrowLeftRight} color="player.control" boxSize={4} />
          </Box>
        </Box>
      </Box>

      {/* Контролы */}
      <Box px={4} py={3} bg="bg.panel">
        {/* Timeline */}
        <Slider.Root
          value={[currentTime]}
          onValueChange={(details) => {
            const newTime = details.value[0]
            syncTime(newTime)
            setCurrentTime(newTime)
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

            {/* Шаг назад/вперёд */}
            <IconButton
              aria-label="Step back"
              onClick={() => stepFrame(false)}
              variant="ghost"
              size="sm"
              title="Shift+← для покадрового шага"
            >
              <Icon as={LuChevronLeft} />
            </IconButton>
            <IconButton
              aria-label="Step forward"
              onClick={() => stepFrame(true)}
              variant="ghost"
              size="sm"
              title="Shift+→ для покадрового шага"
            >
              <Icon as={LuChevronRight} />
            </IconButton>
          </HStack>

          <HStack gap={2}>
            {/* Swap */}
            <Button variant="ghost" size="sm" onClick={swapVideos} title="Поменять аудио (S)">
              <Icon as={LuArrowLeftRight} mr={1} />
              <Text fontSize="xs">Аудио: {audioSource}</Text>
            </Button>

            {/* Volume */}
            <IconButton aria-label={isMuted ? 'Unmute' : 'Mute'} onClick={toggleMute} variant="ghost" size="sm">
              <Icon as={isMuted ? LuVolumeX : LuVolume2} />
            </IconButton>

            {/* Fullscreen */}
            <IconButton
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              onClick={toggleFullscreen}
              variant="ghost"
              size="sm"
            >
              <Icon as={isFullscreen ? LuMinimize : LuMaximize} />
            </IconButton>
          </HStack>
        </HStack>

        {/* Подсказки */}
        <HStack justify="center" mt={2} gap={4}>
          <Text fontSize="xs" color="fg.subtle">
            Space: Play/Pause
          </Text>
          <Text fontSize="xs" color="fg.subtle">
            ←/→: ±5s
          </Text>
          <Text fontSize="xs" color="fg.subtle">
            Shift+←/→: Покадрово
          </Text>
          <Text fontSize="xs" color="fg.subtle">
            S: Swap аудио
          </Text>
          <Text fontSize="xs" color="fg.subtle">
            F: Fullscreen
          </Text>
        </HStack>
      </Box>
    </Box>
  )
}
