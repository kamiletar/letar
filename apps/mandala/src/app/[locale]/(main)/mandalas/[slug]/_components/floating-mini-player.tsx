'use client'

import { Box, HStack, IconButton, Slider, Text, VStack } from '@chakra-ui/react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LuList,
  LuMusic,
  LuPause,
  LuPlay,
  LuRepeat,
  LuRepeat1,
  LuShuffle,
  LuSkipBack,
  LuSkipForward,
  LuVolume2,
  LuVolumeX,
} from 'react-icons/lu'
import type { RepeatMode } from '../_constants/viewer-constants'
import { REPEAT_MODE_LABELS } from '../_constants/viewer-constants'
import type { PlaylistItem } from '../_hooks/use-audio-playback'
import { PlaylistDrawer, SeekableProgress } from './audio-player'

interface FloatingMiniPlayerProps {
  /** Название текущего трека */
  trackName: string
  /** Включено ли воспроизведение */
  isPlaying: boolean
  /** Громкость (0-100) */
  volume: number
  /** Прогресс воспроизведения (0-1) */
  progress: number
  /** Текущее время в секундах */
  currentTime: number
  /** Общая длительность в секундах */
  duration: number
  /** Текущий индекс в плейлисте */
  currentIndex: number
  /** Общее количество треков */
  playlistLength: number
  /** Плейлист */
  playlist: PlaylistItem[]
  /** Режим повтора */
  repeatMode: RepeatMode
  /** Включён ли shuffle */
  isShuffled: boolean
  /** Callback при play/pause */
  onPlayPause: () => void
  /** Callback при изменении громкости */
  onVolumeChange: (volume: number) => void
  /** Callback при перемотке */
  onSeek: (progress: number) => void
  /** Callback следующий трек */
  onNextTrack: () => void
  /** Callback предыдущий трек */
  onPrevTrack: () => void
  /** Callback переключения трека */
  onTrackSelect: (index: number) => void
  /** Callback переключения режима повтора */
  onToggleRepeat: () => void
  /** Callback переключения shuffle */
  onToggleShuffle: () => void
  /** Callback изменения порядка треков */
  onReorder: (playlist: PlaylistItem[]) => void
  /** Показывать ли плеер */
  visible?: boolean
  /** Таймаут сворачивания в секундах */
  collapseTimeout?: number
}

const MotionBox = motion.create(Box)

/**
 * Иконка режима повтора
 */
function RepeatIcon({ mode }: { mode: RepeatMode }) {
  if (mode === 'one') {
    return <LuRepeat1 />
  }
  return <LuRepeat />
}

/**
 * Компактный плавающий плеер с glassmorphism.
 * - Показывает название трека, прогресс-бар с временем
 * - Play/pause, prev/next, volume control
 * - Кнопка открытия плейлиста
 * - Перетаскиваемый
 * - Сворачивается в точку при бездействии
 */
export function FloatingMiniPlayer({
  trackName,
  isPlaying,
  volume,
  progress,
  currentTime,
  duration,
  currentIndex,
  playlistLength,
  playlist,
  repeatMode,
  isShuffled,
  onPlayPause,
  onVolumeChange,
  onSeek,
  onNextTrack,
  onPrevTrack,
  onTrackSelect,
  onToggleRepeat,
  onToggleShuffle,
  onReorder,
  visible = true,
  collapseTimeout = 5,
}: FloatingMiniPlayerProps) {
  const t = useTranslations('viewer.aria')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [showVolume, setShowVolume] = useState(false)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const constraintsRef = useRef<HTMLDivElement>(null)
  // Используем refs для проверки в таймере (избегаем бесконечного цикла)
  const isHoveredRef = useRef(isHovered)
  const showPlaylistRef = useRef(showPlaylist)

  // Синхронизируем refs с state
  useEffect(() => {
    isHoveredRef.current = isHovered
  }, [isHovered])

  useEffect(() => {
    showPlaylistRef.current = showPlaylist
  }, [showPlaylist])

  /**
   * Сброс таймера сворачивания
   */
  const resetCollapseTimer = useCallback(() => {
    if (collapseTimerRef.current) {
      clearTimeout(collapseTimerRef.current)
    }
    setIsCollapsed(false)

    collapseTimerRef.current = setTimeout(() => {
      // Проверяем refs вместо state чтобы избежать stale closure
      if (!isHoveredRef.current && !showPlaylistRef.current) {
        setIsCollapsed(true)
      }
    }, collapseTimeout * 1000)
  }, [collapseTimeout])

  /**
   * Сброс таймера при изменении visible
   */
  useEffect(() => {
    if (visible) {
      resetCollapseTimer()
    }
    return () => {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
      }
    }
  }, [visible, resetCollapseTimer])

  /**
   * Остановка таймера при наведении или открытом плейлисте
   */
  useEffect(() => {
    if (isHovered || showPlaylist) {
      if (collapseTimerRef.current) {
        clearTimeout(collapseTimerRef.current)
      }
      setIsCollapsed(false)
    } else if (visible) {
      resetCollapseTimer()
    }
  }, [isHovered, showPlaylist, visible, resetCollapseTimer])

  /**
   * Обработчик клика по свёрнутой точке
   */
  const handleCollapsedClick = useCallback(() => {
    setIsCollapsed(false)
    resetCollapseTimer()
  }, [resetCollapseTimer])

  /**
   * Mute/Unmute
   */
  const handleMuteToggle = useCallback(() => {
    if (volume > 0) {
      localStorage.setItem('mandala-prev-volume', String(volume))
      onVolumeChange(0)
    } else {
      const prevVolume = parseInt(localStorage.getItem('mandala-prev-volume') || '50', 10)
      onVolumeChange(prevVolume)
    }
  }, [volume, onVolumeChange])

  /**
   * Открыть/закрыть плейлист
   */
  const handleTogglePlaylist = useCallback(() => {
    setShowPlaylist((prev) => !prev)
  }, [])

  if (!visible) {
    return null
  }

  return (
    <>
      {/* Контейнер для drag constraints */}
      <Box
        ref={constraintsRef}
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        pointerEvents="none"
        zIndex={10100}
      />

      <AnimatePresence mode="wait">
        {isCollapsed
          ? (
            /* Свёрнутое состояние — пульсирующая точка */
            <MotionBox
              key="collapsed"
              position="fixed"
              bottom="max(24px, env(safe-area-inset-bottom))" // Учёт notch на iPhone
              right={6}
              width="40px"
              height="40px"
              borderRadius="full"
              bg="purple.500"
              cursor="pointer"
              zIndex={10101}
              onClick={handleCollapsedClick}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              display="flex"
              alignItems="center"
              justifyContent="center"
              boxShadow={isPlaying ? '0 0 20px rgba(139, 92, 246, 0.6)' : '0 0 10px rgba(139, 92, 246, 0.3)'}
            >
              <LuMusic size={20} color="white" />
            </MotionBox>
          )
          : (
            /* Развёрнутое состояние */
            <MotionBox
              key="expanded"
              position="fixed"
              bottom="max(24px, env(safe-area-inset-bottom))"
              right={6}
              drag
              dragConstraints={constraintsRef}
              dragElastic={0.1}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => {
                setIsHovered(false)
                setShowVolume(false)
              }}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.2 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              zIndex={10101}
            >
              <Box
                bg="rgba(20, 20, 30, 0.8)"
                backdropFilter="blur(16px)"
                borderRadius="xl"
                border="1px solid"
                borderColor="whiteAlpha.200"
                boxShadow="0 8px 32px rgba(0, 0, 0, 0.4)"
                overflow="hidden"
                minW="280px"
                cursor="grab"
                _active={{ cursor: 'grabbing' }}
              >
                <VStack gap={0} p={3} align="stretch">
                  {/* Название трека с навигацией */}
                  <HStack justify="space-between" gap={2} mb={2}>
                    {/* Prev button */}
                    <IconButton
                      aria-label={t('prevTrack')}
                      size="xs"
                      variant="ghost"
                      colorPalette="gray"
                      onClick={(e) => {
                        e.stopPropagation()
                        onPrevTrack()
                      }}
                    >
                      <LuSkipBack />
                    </IconButton>

                    {/* Track info */}
                    <VStack gap={0} flex={1} minW={0}>
                      <HStack gap={2} w="100%" justify="center">
                        <Box color="purple.400" flexShrink={0}>
                          <LuMusic size={14} />
                        </Box>
                        <Text fontSize="sm" fontWeight="medium" color="white" lineClamp={1} title={trackName}>
                          {trackName || 'Нет трека'}
                        </Text>
                      </HStack>
                      {/* Playlist position indicator */}
                      {playlistLength > 0 && (
                        <Text fontSize="xs" color="gray.500">
                          {currentIndex + 1} / {playlistLength}
                        </Text>
                      )}
                    </VStack>

                    {/* Next button */}
                    <IconButton
                      aria-label={t('nextTrack')}
                      size="xs"
                      variant="ghost"
                      colorPalette="gray"
                      onClick={(e) => {
                        e.stopPropagation()
                        onNextTrack()
                      }}
                    >
                      <LuSkipForward />
                    </IconButton>
                  </HStack>

                  {/* Seekable progress bar with time */}
                  <Box onClick={(e) => e.stopPropagation()} mb={2}>
                    <SeekableProgress
                      progress={progress}
                      currentTime={currentTime}
                      duration={duration}
                      onSeek={onSeek}
                      showTime={true}
                    />
                  </Box>

                  {/* Controls row */}
                  <HStack justify="space-between" gap={1}>
                    {/* Left controls: repeat, shuffle */}
                    <HStack gap={0}>
                      <IconButton
                        aria-label={`Повтор: ${REPEAT_MODE_LABELS[repeatMode]}`}
                        size="xs"
                        variant="ghost"
                        colorPalette={repeatMode !== 'off' ? 'purple' : 'gray'}
                        opacity={repeatMode === 'off' ? 0.5 : 1}
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleRepeat()
                        }}
                        title={REPEAT_MODE_LABELS[repeatMode]}
                      >
                        <RepeatIcon mode={repeatMode} />
                      </IconButton>

                      <IconButton
                        aria-label={isShuffled ? t('disableShuffle') : t('enableShuffle')}
                        size="xs"
                        variant="ghost"
                        colorPalette={isShuffled ? 'purple' : 'gray'}
                        opacity={isShuffled ? 1 : 0.5}
                        onClick={(e) => {
                          e.stopPropagation()
                          onToggleShuffle()
                        }}
                      >
                        <LuShuffle />
                      </IconButton>
                    </HStack>

                    {/* Right controls: playlist, volume, play/pause */}
                    <HStack gap={1}>
                      {/* Playlist button */}
                      <IconButton
                        aria-label={t('openPlaylist')}
                        size="sm"
                        variant="ghost"
                        colorPalette="purple"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleTogglePlaylist()
                        }}
                      >
                        <LuList />
                      </IconButton>

                      {/* Volume toggle */}
                      <IconButton
                        aria-label={volume > 0 ? t('mute') : t('unmute')}
                        size="sm"
                        variant="ghost"
                        colorPalette="purple"
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowVolume(!showVolume)
                        }}
                      >
                        {volume > 0 ? <LuVolume2 /> : <LuVolumeX />}
                      </IconButton>

                      {/* Play/Pause */}
                      <IconButton
                        aria-label={isPlaying ? t('pause') : t('play')}
                        size="sm"
                        variant="solid"
                        colorPalette="purple"
                        onClick={(e) => {
                          e.stopPropagation()
                          onPlayPause()
                        }}
                      >
                        {isPlaying ? <LuPause /> : <LuPlay />}
                      </IconButton>
                    </HStack>
                  </HStack>

                  {/* Volume slider */}
                  <AnimatePresence>
                    {showVolume && (
                      <MotionBox
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        overflow="hidden"
                      >
                        <HStack gap={2} pt={2}>
                          <IconButton
                            aria-label="Mute"
                            size="xs"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleMuteToggle()
                            }}
                          >
                            {volume > 0 ? <LuVolume2 size={14} /> : <LuVolumeX size={14} />}
                          </IconButton>
                          <Slider.Root
                            size="sm"
                            value={[volume]}
                            onValueChange={(details) => onVolumeChange(details.value[0])}
                            min={0}
                            max={100}
                            step={1}
                            flex={1}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Slider.Control>
                              <Slider.Track>
                                <Slider.Range />
                              </Slider.Track>
                              <Slider.Thumb index={0} />
                            </Slider.Control>
                          </Slider.Root>
                          <Text fontSize="xs" color="gray.400" minW="32px" textAlign="right">
                            {volume}%
                          </Text>
                        </HStack>
                      </MotionBox>
                    )}
                  </AnimatePresence>
                </VStack>
              </Box>
            </MotionBox>
          )}
      </AnimatePresence>

      {/* Playlist drawer */}
      <PlaylistDrawer
        open={showPlaylist}
        onClose={() => setShowPlaylist(false)}
        playlist={playlist}
        currentIndex={currentIndex}
        onTrackSelect={(index) => {
          onTrackSelect(index)
          // Не закрываем drawer сразу — пользователь может хотеть выбрать несколько треков
        }}
        onReorder={onReorder}
        repeatMode={repeatMode}
        onToggleRepeat={onToggleRepeat}
        isShuffled={isShuffled}
        onToggleShuffle={onToggleShuffle}
      />
    </>
  )
}
