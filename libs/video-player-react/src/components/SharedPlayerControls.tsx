'use client'

/**
 * SharedPlayerControls — нижняя панель управления плеером
 *
 * Содержит:
 * - Прогресс бар (seekable) с маркерами глав
 * - Кнопки воспроизведения (play/pause, skip)
 * - Таймер (current / duration)
 * - Громкость (mute, slider)
 * - Скорость воспроизведения
 * - Fullscreen
 *
 * Платформо-специфичная логика передаётся через слоты:
 * - navigationSlot — кнопки prev/next episode (Electron: callbacks, Web: Link)
 * - trackSelectorSlot — выбор аудио/субтитров
 * - extraControlsSlot — PiP, Video Info и др.
 */

import { Box, HStack, IconButton, Text } from '@chakra-ui/react'
import { memo, type ReactNode } from 'react'
import { LuMaximize, LuMinimize, LuPause, LuPlay, LuSkipBack, LuSkipForward } from 'react-icons/lu'

import type { ChapterInfo, PlaybackSpeed } from '../types'
import { SKIP_TIME } from '../types'
import { formatTime } from '../utils/format-time'
import type { SpriteCue } from '../utils/sprite-vtt'
import { SharedProgressBar } from './SharedProgressBar'
import { SharedVolumeControl } from './SharedVolumeControl'
import { SpeedSelector } from './SpeedSelector'
import { Tooltip } from './Tooltip'

export interface SharedPlayerControlsProps {
  /** Видео воспроизводится */
  isPlaying: boolean
  /** Текущее время (секунды) */
  currentTime: number
  /** Длительность (секунды) */
  duration: number
  /** Громкость (0-1) */
  volume: number
  /** Звук выключен */
  isMuted: boolean
  /** Полноэкранный режим */
  isFullscreen: boolean
  /** Показывать контролы */
  isVisible: boolean
  /** Toggle play/pause */
  onTogglePlay: () => void
  /** Seek по прогресс-бару */
  onSeek: (value: number[]) => void
  /** Изменение громкости */
  onVolumeChange: (value: number[]) => void
  /** Toggle mute */
  onToggleMute: () => void
  /** Toggle fullscreen */
  onToggleFullscreen: () => void
  /** Skip time (seconds) */
  onSkipTime: (seconds: number) => void
  /** Главы для маркеров на прогресс-баре */
  chapters?: ChapterInfo[]
  /** Переход к главе */
  onChapterSeek?: (time: number) => void
  /** Скорость воспроизведения */
  playbackSpeed?: PlaybackSpeed
  /** Изменение скорости воспроизведения */
  onPlaybackSpeedChange?: (speed: PlaybackSpeed) => void
  /** Слот для кнопок навигации (prev/next episode) */
  navigationSlot?: ReactNode
  /** Слот для выбора дорожек (audio/subtitle) */
  trackSelectorSlot?: ReactNode
  /** Слот для дополнительных кнопок (PiP, VideoInfo и др.) */
  extraControlsSlot?: ReactNode
  /** URL спрайт-изображения для hover preview на таймлайне */
  spriteUrl?: string
  /** Распарсенные VTT cues для hover preview на таймлайне */
  spriteCues?: SpriteCue[]
}

/**
 * Общая нижняя панель управления плеером
 *
 * Мемоизирован через React.memo для предотвращения лишних рендеров
 * при частых обновлениях currentTime (~4 раза в секунду)
 */
export const SharedPlayerControls = memo(function SharedPlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  isFullscreen,
  isVisible,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onSkipTime,
  chapters,
  onChapterSeek,
  playbackSpeed = 1,
  onPlaybackSpeedChange,
  navigationSlot,
  trackSelectorSlot,
  extraControlsSlot,
  spriteUrl,
  spriteCues,
}: SharedPlayerControlsProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      bg="linear-gradient(transparent, rgba(0,0,0,0.9))"
      pt={16}
      pb={4}
      px={4}
      opacity={isVisible ? 1 : 0}
      pointerEvents={isVisible ? 'auto' : 'none'}
      transition="opacity 0.3s"
      zIndex={5}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Прогресс бар с маркерами глав и hover preview */}
      <SharedProgressBar
        progress={progress}
        onSeek={onSeek}
        chapters={chapters}
        duration={duration}
        onChapterSeek={onChapterSeek}
        spriteUrl={spriteUrl}
        spriteCues={spriteCues}
      />

      <HStack justify="space-between" align="center">
        {/* Левая часть: воспроизведение и время */}
        <HStack gap={2}>
          <Tooltip content={`Назад ${SKIP_TIME} сек (←)`}>
            <IconButton
              aria-label="Skip back"
              variant="ghost"
              colorPalette="whiteAlpha"
              size="sm"
              onClick={() => onSkipTime(-SKIP_TIME)}
            >
              <LuSkipBack size={20} color="var(--chakra-colors-player-control)" />
            </IconButton>
          </Tooltip>

          <Tooltip content={isPlaying ? 'Пауза (Space)' : 'Воспроизведение (Space)'}>
            <IconButton
              aria-label={isPlaying ? 'Pause' : 'Play'}
              variant="ghost"
              colorPalette="whiteAlpha"
              size="md"
              onClick={onTogglePlay}
            >
              {isPlaying
                ? <LuPause size={24} color="var(--chakra-colors-player-control)" />
                : <LuPlay size={24} color="var(--chakra-colors-player-control)" />}
            </IconButton>
          </Tooltip>

          <Tooltip content={`Вперёд ${SKIP_TIME} сек (→)`}>
            <IconButton
              aria-label="Skip forward"
              variant="ghost"
              colorPalette="whiteAlpha"
              size="sm"
              onClick={() => onSkipTime(SKIP_TIME)}
            >
              <LuSkipForward size={20} color="var(--chakra-colors-player-control)" />
            </IconButton>
          </Tooltip>

          <Text color="player.control" fontSize="sm" ml={2}>
            {formatTime(currentTime)} / {formatTime(duration)}
          </Text>

          {/* Навигация между эпизодами (платформо-специфичная) */}
          {navigationSlot}
        </HStack>

        {/* Правая часть: дорожки, скорость, громкость и fullscreen */}
        <HStack gap={2}>
          {/* Выбор дорожек (платформо-специфичный) */}
          {trackSelectorSlot}

          {/* Скорость воспроизведения */}
          {onPlaybackSpeedChange && <SpeedSelector speed={playbackSpeed} onSpeedChange={onPlaybackSpeedChange} />}

          <SharedVolumeControl
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
          />

          {/* Дополнительные кнопки (PiP, VideoInfo и др.) */}
          {extraControlsSlot}

          <Tooltip content={isFullscreen ? 'Выйти из полноэкранного (F)' : 'Полноэкранный режим (F)'}>
            <IconButton
              aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              variant="ghost"
              colorPalette="whiteAlpha"
              size="sm"
              onClick={onToggleFullscreen}
            >
              {isFullscreen
                ? <LuMinimize size={20} color="var(--chakra-colors-player-control)" />
                : <LuMaximize size={20} color="var(--chakra-colors-player-control)" />}
            </IconButton>
          </Tooltip>
        </HStack>
      </HStack>
    </Box>
  )
})
