'use client'

import { Box, HStack, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface SeekableProgressProps {
  /** Прогресс воспроизведения (0-1) */
  progress: number
  /** Текущее время в секундах */
  currentTime: number
  /** Общая длительность в секундах */
  duration: number
  /** Callback при перемотке */
  onSeek: (progress: number) => void
  /** Показывать время */
  showTime?: boolean
  /** Компактный режим (без времени) */
  compact?: boolean
}

/**
 * Форматирует время в строку MM:SS
 */
function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) {
    return '0:00'
  }
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Кликабельный прогресс-бар с отображением времени.
 * Поддерживает drag для перемотки, hover preview.
 */
export function SeekableProgress({
  progress,
  currentTime,
  duration,
  onSeek,
  showTime = true,
  compact = false,
}: SeekableProgressProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [hoverProgress, setHoverProgress] = useState<number | null>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  // Refs для использования в document listeners (избегаем stale closure)
  const isDraggingRef = useRef(false)
  const onSeekRef = useRef(onSeek)

  // Синхронизируем refs
  useEffect(() => {
    onSeekRef.current = onSeek
  }, [onSeek])

  // Вычисляем позицию клика/тача относительно трека
  const getProgressFromEvent = useCallback((clientX: number): number => {
    if (!trackRef.current) {
      return 0
    }
    const rect = trackRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    return Math.max(0, Math.min(1, x / rect.width))
  }, [])

  // Document-level handlers для корректного отпускания за пределами элемента
  useEffect(() => {
    const handleDocumentMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !trackRef.current) {
        return
      }
      const newProgress = getProgressFromEvent(e.clientX)
      setHoverProgress(newProgress)
      onSeekRef.current(newProgress)
    }

    const handleDocumentMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false
        setIsDragging(false)
        setHoverProgress(null)
      }
    }

    document.addEventListener('mousemove', handleDocumentMouseMove)
    document.addEventListener('mouseup', handleDocumentMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleDocumentMouseMove)
      document.removeEventListener('mouseup', handleDocumentMouseUp)
    }
  }, [getProgressFromEvent])

  // Mouse handlers
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      isDraggingRef.current = true
      setIsDragging(true)
      const newProgress = getProgressFromEvent(e.clientX)
      setHoverProgress(newProgress)
      onSeek(newProgress)
    },
    [getProgressFromEvent, onSeek],
  )

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      const newProgress = getProgressFromEvent(e.clientX)
      setHoverProgress(newProgress)
    },
    [getProgressFromEvent],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const newProgress = getProgressFromEvent(e.clientX)
      setHoverProgress(newProgress)
    },
    [getProgressFromEvent],
  )

  const handleMouseLeave = useCallback(() => {
    if (!isDraggingRef.current) {
      setHoverProgress(null)
    }
  }, [])

  // Touch handlers для мобильных
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      isDraggingRef.current = true
      setIsDragging(true)
      const touch = e.touches[0]
      const newProgress = getProgressFromEvent(touch.clientX)
      onSeek(newProgress)
    },
    [getProgressFromEvent, onSeek],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDraggingRef.current) {
        return
      }
      const touch = e.touches[0]
      const newProgress = getProgressFromEvent(touch.clientX)
      onSeek(newProgress)
    },
    [getProgressFromEvent, onSeek],
  )

  const handleTouchEnd = useCallback(() => {
    isDraggingRef.current = false
    setIsDragging(false)
  }, [])

  // Время для hover preview
  const hoverTime = hoverProgress !== null ? hoverProgress * duration : null

  // Отображаемый прогресс (при drag показываем позицию курсора)
  const displayProgress = isDragging && hoverProgress !== null ? hoverProgress : progress

  if (compact) {
    // Компактный режим — только прогресс-бар
    return (
      <Box
        ref={trackRef}
        h="4px"
        bg="whiteAlpha.200"
        borderRadius="full"
        cursor="pointer"
        position="relative"
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <Box
          h="100%"
          bg="purple.500"
          borderRadius="full"
          width={`${displayProgress * 100}%`}
          transition={isDragging ? 'none' : 'width 0.1s linear'}
        />
      </Box>
    )
  }

  return (
    <Box w="100%">
      {/* Прогресс-бар */}
      <Box
        ref={trackRef}
        h="6px"
        bg="whiteAlpha.200"
        borderRadius="full"
        cursor="pointer"
        position="relative"
        onMouseDown={handleMouseDown}
        onMouseEnter={handleMouseEnter}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        _hover={{
          '& > div:first-of-type': {
            h: '8px',
          },
        }}
        transition="height 0.1s"
      >
        {/* Заполненная часть */}
        <Box
          h="100%"
          bg="purple.500"
          borderRadius="full"
          width={`${displayProgress * 100}%`}
          transition={isDragging ? 'none' : 'width 0.1s linear'}
          position="relative"
        >
          {/* Thumb (точка) при hover/drag */}
          <Box
            position="absolute"
            right="-6px"
            top="50%"
            transform="translateY(-50%)"
            w="12px"
            h="12px"
            bg="white"
            borderRadius="full"
            boxShadow="0 0 4px rgba(0,0,0,0.3)"
            opacity={isDragging || hoverProgress !== null ? 1 : 0}
            transition="opacity 0.15s"
          />
        </Box>

        {/* Hover preview tooltip */}
        {hoverProgress !== null && hoverTime !== null && (
          <Box
            position="absolute"
            left={`${hoverProgress * 100}%`}
            bottom="100%"
            transform="translateX(-50%)"
            mb={1}
            px={2}
            py={0.5}
            bg="blackAlpha.800"
            borderRadius="md"
            fontSize="xs"
            color="white"
            whiteSpace="nowrap"
            pointerEvents="none"
          >
            {formatTime(hoverTime)}
          </Box>
        )}
      </Box>

      {/* Время */}
      {showTime && (
        <HStack justify="space-between" mt={1}>
          <Text fontSize="xs" color="gray.400" fontVariantNumeric="tabular-nums">
            {formatTime(currentTime)}
          </Text>
          <Text fontSize="xs" color="gray.400" fontVariantNumeric="tabular-nums">
            {formatTime(duration)}
          </Text>
        </HStack>
      )}
    </Box>
  )
}
