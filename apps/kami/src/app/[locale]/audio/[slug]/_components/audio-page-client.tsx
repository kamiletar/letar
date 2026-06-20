'use client'

import { Box, Button, Card, Heading, HStack, Image, Text, VStack } from '@chakra-ui/react'
import { useColorMode } from '@letar/chakra-provider'
import Link from 'next/link'
import { useCallback, useRef, useState } from 'react'
import { AudioPlayer } from './audio-player'
import { AudioSpectrogram } from './audio-spectrogram'
import { AudioSpectrumVisualizer } from './audio-spectrum-visualizer'

interface AudioData {
  title: string
  artist: string | null
  album: string | null
  duration: number | null
  size: number
  bitrate: number | null
  coverPath: string | null
  path: string
  uploadedAt: Date
}

interface AudioPageClientProps {
  audio: AudioData
  locale: string
}

/** Форматирование размера файла */
function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(0)} КБ`
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} МБ`
}

/** Форматирование длительности */
function formatDuration(seconds: number): string {
  const min = Math.floor(seconds / 60)
  const sec = seconds % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

/**
 * Клиентская обёртка страницы аудио.
 * Управляет audioRef, isPlaying и общим AnalyserNode для визуализаторов.
 */
export function AudioPageClient({ audio, locale }: AudioPageClientProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  /** Общий AnalyserNode — один на оба визуализатора */
  const analyzerRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const connectedRef = useRef<HTMLAudioElement | null>(null)

  /** Инициализация Web Audio API — вызывается при первом Play */
  const getAnalyzer = useCallback(() => {
    const audioElement = audioRef.current
    if (!audioElement) {
      return null
    }

    // Уже подключены к этому элементу
    if (connectedRef.current === audioElement && analyzerRef.current) {
      return analyzerRef.current
    }

    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext()
      }

      const ctx = audioContextRef.current
      const analyzer = ctx.createAnalyser()
      analyzer.fftSize = 2048
      analyzer.smoothingTimeConstant = 0.75
      analyzerRef.current = analyzer

      const source = ctx.createMediaElementSource(audioElement)
      source.connect(analyzer)
      analyzer.connect(ctx.destination)
      connectedRef.current = audioElement

      return analyzer
    } catch {
      // Элемент уже подключён — вернём существующий analyzer
      return analyzerRef.current
    }
  }, [])

  const { resolvedColorMode } = useColorMode()
  const isLight = resolvedColorMode === 'light'
  const audioUrl = `/api/files/${audio.path}`

  return (
    <Box position="relative" minH="calc(100vh - 60px)" overflow="hidden">
      {/* Matrix rain визуализатор на фоне */}
      <AudioSpectrumVisualizer audioRef={audioRef} isPlaying={isPlaying} getAnalyzer={getAnalyzer} />

      {/* Контент поверх */}
      <Box position="relative" zIndex={1} maxW="600px" mx="auto" py={12} px={4}>
        <VStack gap={6} align="stretch">
          {/* Обложка */}
          {audio.coverPath && (
            <Box mx="auto" borderRadius="lg" overflow="hidden" maxW="300px">
              <Image src={`/api/files/${audio.coverPath}`} alt={audio.title} width="300px" height="300px" />
            </Box>
          )}

          <VStack
            gap={2}
            textAlign="center"
            bg={{ base: 'white/15', _dark: 'transparent' }}
            backdropFilter={{ base: 'blur(10px)', _dark: 'none' }}
            borderRadius="xl"
            borderWidth={{ base: '1px', _dark: '0' }}
            borderColor="white/20"
            px={4}
            py={3}
          >
            <Heading size="2xl">{audio.title}</Heading>
            <HStack gap={4} justify="center" color="fg.muted" fontSize="sm" flexWrap="wrap">
              {audio.artist && <Text fontWeight="medium">{audio.artist}</Text>}
              {audio.album && <Text>{audio.album}</Text>}
              <Text>{formatSize(audio.size)}</Text>
              {audio.duration && <Text>{formatDuration(audio.duration)}</Text>}
              {audio.bitrate && <Text>{audio.bitrate} kbps</Text>}
              <Text>{new Date(audio.uploadedAt).toLocaleDateString('ru-RU')}</Text>
            </HStack>
          </VStack>

          <Card.Root
            bg={{ base: 'white/15', _dark: 'bg/75' }}
            backdropFilter={{ base: 'blur(10px)', _dark: 'blur(12px)' }}
            shadow={{ base: 'lg', _dark: 'none' }}
            borderWidth={{ base: '1px', _dark: '0' }}
            borderColor={{ base: 'white/30', _dark: 'border' }}
          >
            <Card.Body gap={3}>
              {/* Спектрограмма (сонограмма) — как в foobar2000 */}
              <AudioSpectrogram
                audioRef={audioRef}
                isPlaying={isPlaying}
                getAnalyzer={getAnalyzer}
                lightMode={isLight}
              />

              <AudioPlayer
                src={audioUrl}
                title={audio.title}
                duration={audio.duration ?? undefined}
                audioRef={audioRef}
                isPlaying={isPlaying}
                setIsPlaying={setIsPlaying}
              />
            </Card.Body>
          </Card.Root>

          <HStack justify="center" gap={3}>
            <Button
              asChild
              variant="outline"
              size="sm"
              borderColor={{ base: 'gray.400', _dark: 'border' }}
              color={{ base: 'gray.800', _dark: 'inherit' }}
              fontWeight="semibold"
            >
              <a href={audioUrl} download>
                Скачать
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              size="sm"
              borderColor={{ base: 'gray.400', _dark: 'border' }}
              color={{ base: 'gray.800', _dark: 'inherit' }}
              fontWeight="semibold"
            >
              <Link href={`/${locale}/audio`}>Все аудио</Link>
            </Button>
          </HStack>
        </VStack>
      </Box>
    </Box>
  )
}
