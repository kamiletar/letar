'use client'

/**
 * ConcurrencyControls — управление количеством параллельных потоков
 *
 * Показывает:
 * - Текущее количество активных потоков (видео/аудио)
 * - Максимальные лимиты с возможностью изменения
 *
 * Изменения применяются на лету:
 * - Увеличение лимита — сразу запускает новые задачи (если есть в очереди)
 * - Уменьшение лимита — не останавливает активные, но не запускает новые пока активных > лимита
 */

import { Badge, Box, HStack, Slider, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { LuCpu, LuMonitor } from 'react-icons/lu'

import type { AggregatedProgress } from '../../../../shared/types/parallel-transcode'

interface ConcurrencyControlsProps {
  /** Показывать ли компактную версию */
  compact?: boolean
}

export function ConcurrencyControls({ compact = false }: ConcurrencyControlsProps) {
  const [videoMaxConcurrent, setVideoMaxConcurrent] = useState(2)
  const [audioMaxConcurrent, setAudioMaxConcurrent] = useState(4)
  const [activeVideoWorkers, setActiveVideoWorkers] = useState(0)
  const [activeAudioWorkers, setActiveAudioWorkers] = useState(0)
  const [isLoading, setIsLoading] = useState(true)

  // Количество логических ядер CPU (для максимума аудио потоков)
  const cpuCores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8

  // Загружаем текущие значения при монтировании
  useEffect(() => {
    const loadLimits = async () => {
      const api = window.electronAPI
      if (!api) {
        setIsLoading(false)
        return
      }

      try {
        const result = await api.parallelTranscode.getConcurrencyLimits()
        if (result.success && result.data) {
          setVideoMaxConcurrent(result.data.videoMaxConcurrent)
          setAudioMaxConcurrent(result.data.audioMaxConcurrent)
        }
      } catch (error) {
        console.warn('[ConcurrencyControls] Failed to load limits:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadLimits()
  }, [])

  // Подписка на прогресс для получения текущего количества активных потоков
  useEffect(() => {
    const api = window.electronAPI
    if (!api) {
      return
    }

    const handleProgress = (progress: AggregatedProgress) => {
      // Считаем активные видео воркеры (running tasks)
      const activeVideo = progress.videoTasks.tasks.filter((t) => t.status === 'running').length
      setActiveVideoWorkers(activeVideo)

      // Считаем активные аудио воркеры (running tasks)
      const activeAudio = progress.audioTasks.tasks.filter((t) => t.status === 'running').length
      setActiveAudioWorkers(activeAudio)
    }

    const unsubscribe = api.parallelTranscode.onAggregatedProgress(handleProgress)

    return () => {
      unsubscribe?.()
    }
  }, [])

  // Обработчик изменения видео потоков
  const handleVideoChange = useCallback(async (value: number) => {
    setVideoMaxConcurrent(value)

    const api = window.electronAPI
    if (!api) {
      return
    }

    try {
      const result = await api.parallelTranscode.setVideoMaxConcurrent(value)
      if (result.success && result.value !== undefined) {
        setVideoMaxConcurrent(result.value)
      }
    } catch (error) {
      console.warn('[ConcurrencyControls] Failed to set video limit:', error)
    }
  }, [])

  // Обработчик изменения аудио потоков
  const handleAudioChange = useCallback(async (value: number) => {
    setAudioMaxConcurrent(value)

    const api = window.electronAPI
    if (!api) {
      return
    }

    try {
      const result = await api.parallelTranscode.setAudioMaxConcurrent(value)
      if (result.success && result.value !== undefined) {
        setAudioMaxConcurrent(result.value)
      }
    } catch (error) {
      console.warn('[ConcurrencyControls] Failed to set audio limit:', error)
    }
  }, [])

  if (isLoading) {
    return null
  }

  if (compact) {
    return (
      <HStack gap={4}>
        <HStack gap={2}>
          <LuMonitor size={16} color="var(--chakra-colors-purple-400)" />
          <Text fontSize="sm" color="fg.muted">
            GPU:
          </Text>
          <Badge colorPalette="purple">
            {activeVideoWorkers}/{videoMaxConcurrent}
          </Badge>
        </HStack>
        <HStack gap={2}>
          <LuCpu size={16} color="var(--chakra-colors-cyan-400)" />
          <Text fontSize="sm" color="fg.muted">
            CPU:
          </Text>
          <Badge colorPalette="cyan">
            {activeAudioWorkers}/{audioMaxConcurrent}
          </Badge>
        </HStack>
      </HStack>
    )
  }

  return (
    <Box p={4} bg="bg.subtle" borderRadius="md">
      <VStack gap={4} align="stretch">
        {/* Видео (GPU) потоки */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <HStack gap={2}>
              <LuMonitor size={16} color="var(--chakra-colors-purple-400)" />
              <Text fontSize="sm" fontWeight="medium">
                GPU потоки (видео)
              </Text>
            </HStack>
            <HStack gap={2}>
              <Text fontSize="sm" color="fg.muted">
                Активных:
              </Text>
              <Badge colorPalette={activeVideoWorkers > 0 ? 'green' : 'gray'}>{activeVideoWorkers}</Badge>
              <Text fontSize="sm" color="fg.muted">
                /
              </Text>
              <Badge colorPalette="purple">{videoMaxConcurrent}</Badge>
            </HStack>
          </HStack>
          <Slider.Root
            value={[videoMaxConcurrent]}
            min={1}
            max={4}
            step={1}
            onValueChange={(e) => handleVideoChange(e.value[0])}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumb index={0} />
            </Slider.Control>
          </Slider.Root>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            Больше потоков = быстрее, но выше нагрузка на GPU
          </Text>
        </Box>

        {/* Аудио (CPU) потоки */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <HStack gap={2}>
              <LuCpu size={16} color="var(--chakra-colors-cyan-400)" />
              <Text fontSize="sm" fontWeight="medium">
                CPU потоки (аудио)
              </Text>
            </HStack>
            <HStack gap={2}>
              <Text fontSize="sm" color="fg.muted">
                Активных:
              </Text>
              <Badge colorPalette={activeAudioWorkers > 0 ? 'green' : 'gray'}>{activeAudioWorkers}</Badge>
              <Text fontSize="sm" color="fg.muted">
                /
              </Text>
              <Badge colorPalette="cyan">{audioMaxConcurrent}</Badge>
            </HStack>
          </HStack>
          <Slider.Root
            value={[audioMaxConcurrent]}
            min={1}
            max={cpuCores}
            step={1}
            onValueChange={(e) => handleAudioChange(e.value[0])}
          >
            <Slider.Control>
              <Slider.Track>
                <Slider.Range />
              </Slider.Track>
              <Slider.Thumb index={0} />
            </Slider.Control>
          </Slider.Root>
          <Text fontSize="xs" color="fg.muted" mt={1}>
            Рекомендуется: количество ядер CPU
          </Text>
        </Box>
      </VStack>
    </Box>
  )
}
