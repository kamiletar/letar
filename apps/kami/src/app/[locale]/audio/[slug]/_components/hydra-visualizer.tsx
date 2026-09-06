'use client'

import { Box, Button, HStack, IconButton, Text, Textarea, VStack } from '@chakra-ui/react'
import type HydraRenderer from 'hydra-synth'
import Hydra from 'hydra-synth'
import { ChevronDown, ChevronUp, Play, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface HydraVisualizerProps {
  /** Общий AnalyserNode — источник FFT для `a.fft[...]` внутри пользовательского кода */
  getAnalyzer: () => AnalyserNode | null
  onClose: () => void
}

const STORAGE_KEY = 'kami-hydra-code'

const PRESETS = [
  {
    name: 'Пульс баса',
    code: `osc(10, 0.1, () => a.fft[0] * 3)
  .color(() => a.fft[1], 0.5, () => a.fft[2])
  .modulate(noise(3))
  .out()`,
  },
  {
    name: 'Калейдоскоп',
    code: `osc(4, 0.1, 1)
  .kaleid(() => 3 + a.fft[3] * 5)
  .color(1, 0.5, () => a.fft[2])
  .rotate(() => a.fft[1] * 0.1)
  .out()`,
  },
  {
    name: 'Вороной',
    code: `voronoi(() => 5 + a.fft[1] * 15, 0.3, 0.3)
  .color(() => a.fft[0], () => a.fft[2], 1)
  .out()`,
  },
]

const GUIDE_TEXT = `Быстрый старт:
osc(частота, скорость, цветовой сдвиг) — генератор волн, .out() — обязателен в конце цепочки.
.color(r, g, b) — окраска, .modulate(шейдер) — искажение одного паттерна другим.
.kaleid(N) / .rotate(угол) — симметрия и вращение.

Аудио — глобальный объект a.fft[0..3] (0..1):
a.fft[0] — бас, a.fft[1] — нижняя середина, a.fft[2] — верхняя середина/высокие, a.fft[3] — самые высокие.
Можно передавать функцией вместо числа — тогда значение живое: () => a.fft[0] * 3.

Ctrl+Enter — применить код. Полная документация: hydra.ojack.xyz, toplap.org.`

/**
 * Fullscreen VJ live-coding режим на Hydra (`hydra-synth`) — Фаза 9.7.
 *
 * В отличие от Butterchurn, здесь нет готовых пресетов "из коробки" — пользователь пишет
 * код визуализации сам и применяет его вручную (Ctrl+Enter). Аудио-реактивность — через
 * глобальный `a.fft[...]`, который этот компонент сам заполняет из общего `AnalyserNode`
 * на каждом тике (`detectAudio: false` у Hydra — библиотека НЕ создаёт свой источник
 * через `getUserMedia`, микрофон не запрашивается).
 */
export function HydraVisualizer({ getAnalyzer, onClose }: HydraVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const hydraRef = useRef<HydraRenderer | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastTimeRef = useRef<number>(0)
  const fftDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null)
  const fftBinsRef = useRef<number[]>([0, 0, 0, 0])

  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(true)
  const [guideOpen, setGuideOpen] = useState(false)

  /** Пересчитывает `a.fft` из аналайзера — вызывается на каждом кадре перед `hydra.tick()` */
  function updateFft() {
    const analyzer = getAnalyzer()
    if (!analyzer) {
      return
    }
    if (!fftDataRef.current || fftDataRef.current.length !== analyzer.frequencyBinCount) {
      fftDataRef.current = new Uint8Array(analyzer.frequencyBinCount)
    }
    const data = fftDataRef.current
    analyzer.getByteFrequencyData(data)

    const bins = fftBinsRef.current
    const bandSize = Math.floor(data.length / bins.length)
    for (let i = 0; i < bins.length; i++) {
      let sum = 0
      for (let j = i * bandSize; j < (i + 1) * bandSize; j++) {
        sum += data[j]
      }
      bins[i] = sum / bandSize / 255
    }
  }

  function runCode(source: string) {
    const hydra = hydraRef.current
    if (!hydra) {
      return
    }
    try {
      hydra.eval(source)
      setError(null)
      window.localStorage.setItem(STORAGE_KEY, source)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError))
    }
  }

  const handleRun = () => runCode(code)

  const handleLoadPreset = (presetCode: string) => {
    setCode(presetCode)
    runCode(presetCode)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault()
      runCode(code)
    }
  }

  // Инициализация Hydra + собственный рендер-луп (autoLoop: false — иначе внутренний
  // raf-loop пакета не остановить снаружи при размонтировании компонента)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) {
      return
    }

    const width = window.innerWidth
    const height = window.innerHeight
    canvas.width = width
    canvas.height = height

    const hydra = new Hydra({
      canvas,
      width,
      height,
      detectAudio: false,
      autoLoop: false,
      makeGlobal: true,
    })
    hydraRef.current = hydra // Глобальный `a` для пользовательского кода — тот же объект живёт весь сеанс,
     // содержимое `.fft` обновляется в рендер-лупе, ссылка не меняется
    ;(window as unknown as { a: { fft: number[] } }).a = { fft: fftBinsRef.current }

    const savedCode = window.localStorage.getItem(STORAGE_KEY)
    const initialCode = savedCode || PRESETS[0].code
    setCode(initialCode)
    runCode(initialCode)

    lastTimeRef.current = performance.now()
    function loop(now: number) {
      const dt = now - lastTimeRef.current
      lastTimeRef.current = now
      updateFft()
      hydraRef.current?.tick(dt)
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
      hydraRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- инициализация один раз при монтировании
  }, [])

  // Ресайз canvas под viewport
  useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current
      if (!canvas || !hydraRef.current) {
        return
      }
      const width = window.innerWidth
      const height = window.innerHeight
      canvas.width = width
      canvas.height = height
      hydraRef.current.synth.setResolution(width, height)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Esc/выход из fullscreen браузером — закрываем режим вместе с ним
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
    <Box position="fixed" inset={0} zIndex="modal" bg="black">
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      <Box position="fixed" top={4} right={4} zIndex="modal" display="flex" gap={2}>
        <IconButton
          aria-label={editorOpen ? 'Свернуть редактор' : 'Развернуть редактор'}
          onClick={() => setEditorOpen((v) => !v)}
          variant="subtle"
          size="sm"
          rounded="full"
        >
          {editorOpen ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </IconButton>
        <IconButton aria-label="Закрыть VJ-режим" onClick={handleClose} variant="subtle" size="sm" rounded="full">
          <X size={18} />
        </IconButton>
      </Box>

      {editorOpen && (
        <Box
          position="fixed"
          bottom={0}
          left={0}
          right={0}
          zIndex="modal"
          bg="black/85"
          backdropFilter="blur(8px)"
          borderTopWidth="1px"
          borderColor="whiteAlpha.200"
          p={3}
          maxH="45vh"
          overflowY="auto"
        >
          <VStack gap={2} align="stretch">
            <HStack gap={2} flexWrap="wrap">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.name}
                  size="xs"
                  variant="outline"
                  colorPalette="whiteAlpha"
                  onClick={() => handleLoadPreset(preset.code)}
                >
                  {preset.name}
                </Button>
              ))}
              <Button size="xs" variant="ghost" colorPalette="whiteAlpha" onClick={() => setGuideOpen((v) => !v)}>
                {guideOpen ? 'Скрыть подсказку' : 'Подсказка'}
              </Button>
            </HStack>

            {guideOpen && (
              <Text fontSize="xs" color="whiteAlpha.700" whiteSpace="pre-wrap" fontFamily="mono">
                {GUIDE_TEXT}
              </Text>
            )}

            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={handleKeyDown}
              fontFamily="mono"
              fontSize="sm"
              color="green.300"
              bg="blackAlpha.600"
              borderColor="whiteAlpha.300"
              minH="120px"
              rows={5}
              spellCheck={false}
            />

            <HStack justify="space-between">
              {error
                ? (
                  <Text fontSize="xs" color="red.400">
                    {error}
                  </Text>
                )
                : <Text fontSize="xs" color="whiteAlpha.500">Ctrl+Enter — применить</Text>}
              <Button size="xs" onClick={handleRun} colorPalette="green">
                <Play size={12} />
                Запустить
              </Button>
            </HStack>
          </VStack>
        </Box>
      )}
    </Box>
  )
}
