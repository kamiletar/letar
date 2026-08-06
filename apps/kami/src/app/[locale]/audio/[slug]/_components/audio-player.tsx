'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { Box, Button, HStack, IconButton, Text, VStack } from '@chakra-ui/react'
import { Copy, Pause, Play, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

interface AudioPlayerProps {
  src: string
  title: string
  /** Длительность в секундах из БД — показывается сразу до загрузки metadata */
  duration?: number
  /** Ссылка на audio элемент (управляется родителем) */
  audioRef: React.RefObject<HTMLAudioElement | null>
  /** Воспроизводится ли аудио (управляется родителем) */
  isPlaying: boolean
  /** Установить состояние воспроизведения */
  setIsPlaying: (playing: boolean) => void
}

/** Форматирование секунд в M:SS */
function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '0:00'
  }
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Кастомный аудиоплеер — показывает длительность сразу (из БД),
 * не дожидаясь загрузки metadata браузером.
 * audioRef и isPlaying управляются родителем (для визуализатора на фоне).
 */
export function AudioPlayer({ src, title, duration: dbDuration, audioRef, isPlaying, setIsPlaying }: AudioPlayerProps) {
  const [currentTime, setCurrentTime] = useState(0)
  const [audioDuration, setAudioDuration] = useState(dbDuration ?? 0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isSeeking, setIsSeeking] = useState(false)

  // Обновляем duration если пришёл из metadata (более точное значение)
  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current
    if (audio && Number.isFinite(audio.duration)) {
      setAudioDuration(audio.duration)
    }
  }, [audioRef])

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current
    if (audio && !isSeeking) {
      setCurrentTime(audio.currentTime)
    }
  }, [audioRef, isSeeking])

  const handleEnded = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [setIsPlaying])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }
    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }, [audioRef, isPlaying, setIsPlaying])

  const handleSeekChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number(e.target.value)
    setCurrentTime(value)
  }, [])

  const handleSeekStart = useCallback(() => {
    setIsSeeking(true)
  }, [])

  const handleSeekEnd = useCallback(() => {
    const audio = audioRef.current
    if (audio) {
      audio.currentTime = currentTime
    }
    setIsSeeking(false)
  }, [audioRef, currentTime])

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const audio = audioRef.current
      const value = Number(e.target.value)
      if (audio) {
        audio.volume = value
      }
      setVolume(value)
      setIsMuted(value === 0)
    },
    [audioRef],
  )

  const toggleMute = useCallback(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }
    if (isMuted) {
      audio.muted = false
      setIsMuted(false)
    } else {
      audio.muted = true
      setIsMuted(true)
    }
  }, [audioRef, isMuted])

  const copyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href)
    toaster.success({ title: 'Ссылка скопирована' })
  }, [])

  // Синхронизация состояния play/pause с audio элементом
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) {
      return
    }

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [audioRef, setIsPlaying])

  return (
    <VStack gap={4} align="stretch">
      {/* Скрытый audio элемент */}
      <audio
        ref={audioRef}
        preload="metadata"
        aria-label={title}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
      >
        <source src={src} type="audio/mpeg" />
      </audio>

      {/* Контролы */}
      <HStack gap={3}>
        {/* Play/Pause */}
        <IconButton
          aria-label={isPlaying ? 'Пауза' : 'Воспроизвести'}
          onClick={togglePlay}
          variant="ghost"
          color="fg"
          size="sm"
          rounded="full"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </IconButton>

        {/* Seekbar */}
        <Box flex={1} position="relative">
          <input
            type="range"
            min={0}
            max={audioDuration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeekChange}
            onMouseDown={handleSeekStart}
            onTouchStart={handleSeekStart}
            onMouseUp={handleSeekEnd}
            onTouchEnd={handleSeekEnd}
            aria-label="Перемотка"
            style={{
              width: '100%',
              height: '4px',
              cursor: 'pointer',
              accentColor: 'var(--chakra-colors-fg)',
            }}
          />
        </Box>

        {/* Время */}
        <Text color="fg.muted" fontSize="xs" fontFamily="mono" whiteSpace="nowrap" minW="80px" textAlign="center">
          {formatTime(currentTime)} / {formatTime(audioDuration)}
        </Text>

        {/* Громкость */}
        <IconButton
          aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
          onClick={toggleMute}
          variant="ghost"
          color="fg"
          size="sm"
          rounded="full"
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </IconButton>

        <Box w="60px" display={{ base: 'none', sm: 'block' }}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            aria-label="Громкость"
            style={{
              width: '100%',
              height: '4px',
              cursor: 'pointer',
              accentColor: 'var(--chakra-colors-fg)',
            }}
          />
        </Box>
      </HStack>

      <HStack justify="center">
        <Button variant="subtle" size="sm" onClick={copyLink}>
          <Copy size={16} />
          Скопировать ссылку
        </Button>
      </HStack>
    </VStack>
  )
}
