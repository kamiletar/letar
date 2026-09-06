'use client'

import { Box, IconButton } from '@chakra-ui/react'
import butterchurn from 'butterchurn'
import type { ButterchurnVisualizerInstance } from 'butterchurn'
import butterchurnPresets from 'butterchurn-presets'
import { SkipForward, X } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface ButterchurnVisualizerProps {
  /** Получить общий AudioContext (тот же, что у AnalyserNode в audio-page-client) */
  getAudioContext: () => AudioContext | null
  /** Получить общий AnalyserNode — источник аудио для butterchurn */
  getAnalyzer: () => AnalyserNode | null
  onClose: () => void
}

/**
 * Fullscreen-визуализация Butterchurn (WebGL-порт Milkdrop 2) — Фаза 9.6.
 *
 * Подключается к уже существующему аудио-графу через `connectAudio(analyzer)` — не создаёт
 * собственный AudioContext/source, использует тот же `AnalyserNode`, что и остальные
 * визуализаторы страницы. Рендер идёт в `requestAnimationFrame`, ресайз — через `ResizeObserver`.
 */
export function ButterchurnVisualizer({ getAudioContext, getAnalyzer, onClose }: ButterchurnVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const visualizerRef = useRef<ButterchurnVisualizerInstance | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const presetNamesRef = useRef<string[]>([])
  const presetsRef = useRef<Record<string, unknown>>({})
  const presetIndexRef = useRef(0)

  /** Загружает случайный пресет (или следующий по кругу — см. `handleNextPreset`) */
  function loadPresetAt(index: number) {
    const names = presetNamesRef.current
    const visualizer = visualizerRef.current
    if (!visualizer || names.length === 0) {
      return
    }
    const name = names[((index % names.length) + names.length) % names.length]
    visualizer.loadPreset(presetsRef.current[name], 2.0)
  }

  const handleNextPreset = () => {
    presetIndexRef.current += 1
    loadPresetAt(presetIndexRef.current)
  }

  // Инициализация visualizer + fullscreen + рендер-луп
  useEffect(() => {
    const canvas = canvasRef.current
    // Порядок важен: getAnalyzer() лениво создаёт AudioContext при первом вызове —
    // getAudioContext() должен вызываться после него, иначе вернёт null на самом первом открытии
    const analyzer = getAnalyzer()
    const audioContext = getAudioContext()
    if (!canvas || !audioContext) {
      return
    }

    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = width
    canvas.height = height

    const visualizer = butterchurn.createVisualizer(audioContext, canvas, {
      width,
      height,
      pixelRatio: window.devicePixelRatio || 1,
    })
    visualizerRef.current = visualizer

    if (analyzer) {
      visualizer.connectAudio(analyzer)
    }

    const presets = butterchurnPresets.getPresets()
    presetsRef.current = presets
    presetNamesRef.current = Object.keys(presets)
    presetIndexRef.current = Math.floor(Math.random() * Math.max(presetNamesRef.current.length, 1))
    loadPresetAt(presetIndexRef.current)

    function loop() {
      visualizerRef.current?.render()
      animationFrameRef.current = requestAnimationFrame(loop)
    }
    animationFrameRef.current = requestAnimationFrame(loop)

    document.documentElement.requestFullscreen?.().catch(() => {
      // Fullscreen может быть отклонён политикой браузера — визуализация всё равно работает
      // как fixed-оверлей на весь viewport, просто без скрытия браузерного UI
    })

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      if (analyzer) {
        visualizer.disconnectAudio(analyzer)
      }
      visualizerRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- инициализация один раз при монтировании
  }, [])

  // Ресайз canvas под viewport
  useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current
      if (!canvas || !visualizerRef.current) {
        return
      }
      const width = window.innerWidth
      const height = window.innerHeight
      canvas.width = width
      canvas.height = height
      visualizerRef.current.setRendererSize(width, height)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Esc/выход из fullscreen браузером — закрываем визуализацию вместе с ним
  useEffect(() => {
    function handleFullscreenChange() {
      if (!document.fullscreenElement) {
        onClose()
      }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [onClose])

  const handleClose = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    }
    onClose()
  }

  return (
    <Box ref={wrapperRef} position="fixed" inset={0} zIndex="modal" bg="black">
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      <Box position="fixed" top={4} right={4} zIndex="modal" display="flex" gap={2}>
        <IconButton aria-label="Следующий пресет" onClick={handleNextPreset} variant="subtle" size="sm" rounded="full">
          <SkipForward size={18} />
        </IconButton>
        <IconButton aria-label="Закрыть визуализацию" onClick={handleClose} variant="subtle" size="sm" rounded="full">
          <X size={18} />
        </IconButton>
      </Box>
    </Box>
  )
}
