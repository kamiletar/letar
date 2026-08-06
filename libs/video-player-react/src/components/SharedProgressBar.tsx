'use client'

/**
 * SharedProgressBar — прогресс-бар с маркерами глав и hover preview из sprite sheet
 */

import { Box, Slider } from '@chakra-ui/react'
import { useCallback, useMemo, useRef, useState } from 'react'

import type { ChapterInfo } from '../types'
import type { SpriteCue } from '../utils/sprite-vtt'
import { TimelinePreview } from './TimelinePreview'
import { Tooltip } from './Tooltip'

export interface SharedProgressBarProps {
  /** Текущий прогресс (0-100) */
  progress: number
  /** Callback при перемотке */
  onSeek: (value: number[]) => void
  /** Главы для маркеров на прогресс-баре */
  chapters?: ChapterInfo[]
  /** Длительность видео (секунды) */
  duration: number
  /** Переход к главе */
  onChapterSeek?: (time: number) => void
  /** URL спрайт-изображения для hover preview */
  spriteUrl?: string
  /** Распарсенные VTT cues для hover preview */
  spriteCues?: SpriteCue[]
}

/**
 * Прогресс-бар с маркерами глав и hover preview
 */
export function SharedProgressBar({
  progress,
  onSeek,
  chapters,
  duration,
  onChapterSeek,
  spriteUrl,
  spriteCues,
}: SharedProgressBarProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState(false)
  const [hoverTime, setHoverTime] = useState(0)
  const [cursorX, setCursorX] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)

  const hasPreview = Boolean(spriteUrl && spriteCues && spriteCues.length > 0)

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!hasPreview || !containerRef.current || duration <= 0) {
        return
      }
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const fraction = Math.max(0, Math.min(1, x / rect.width))
      setCursorX(x)
      setContainerWidth(rect.width)
      setHoverTime(fraction * duration)
    },
    [hasPreview, duration],
  )

  const handleMouseEnter = useCallback(() => {
    if (hasPreview) {
      setIsHovering(true)
    }
  }, [hasPreview])

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false)
  }, [])

  // Мемоизируем маркеры глав — они не зависят от currentTime
  const chapterMarkers = useMemo(() => {
    if (!chapters || chapters.length === 0 || duration <= 0) {
      return null
    }

    return chapters.map((chapter) => {
      const position = (chapter.startTime / duration) * 100
      return {
        id: chapter.id,
        title: chapter.title,
        position,
        startTime: chapter.startTime,
      }
    })
  }, [chapters, duration])

  return (
    <Box
      ref={containerRef}
      position="relative"
      mb={3}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Hover preview из sprite sheet */}
      {isHovering && spriteUrl && spriteCues && spriteCues.length > 0 && (
        <TimelinePreview
          spriteUrl={spriteUrl}
          cues={spriteCues}
          hoverTime={hoverTime}
          cursorX={cursorX}
          containerWidth={containerWidth}
        />
      )}

      <Slider.Root value={[progress]} min={0} max={100} step={0.1} onValueChange={(e) => onSeek(e.value)}>
        <Slider.Control>
          <Slider.Track h="4px" bg="player.track">
            <Slider.Range bg="player.range" />
          </Slider.Track>
          <Slider.Thumb index={0} boxSize={4} bg="player.thumb" />
        </Slider.Control>
      </Slider.Root>

      {/* Маркеры глав (мемоизированы) */}
      {chapterMarkers && (
        <Box position="absolute" top={0} left={0} right={0} bottom={0} pointerEvents="none">
          {chapterMarkers.map((marker) => (
            <Tooltip key={marker.id} content={marker.title}>
              <Box
                position="absolute"
                left={`${marker.position}%`}
                top="50%"
                transform="translate(-50%, -50%)"
                w="2px"
                h="12px"
                bg="player.marker"
                opacity={0.9}
                borderRadius="full"
                cursor="pointer"
                pointerEvents="auto"
                onClick={(e) => {
                  e.stopPropagation()
                  onChapterSeek?.(marker.startTime)
                }}
                _hover={{
                  h: '16px',
                  opacity: 1,
                  bg: 'player.marker.hover',
                }}
                transition="all 0.15s"
              />
            </Tooltip>
          ))}
        </Box>
      )}
    </Box>
  )
}
