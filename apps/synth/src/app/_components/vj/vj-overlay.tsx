'use client'

import type { SubtractivePatch } from '@/lib/patch/schema'
import { Box, Text } from '@chakra-ui/react'
import { type RefObject, useEffect, useRef, useState } from 'react'
import { DEFAULT_VJ_SCENE, VJ_SCENES } from './scenes'
import { SpinGraphCanvas } from './spin-graph-canvas'
import { useExternalAudioInput } from './use-external-audio-input'

interface VjOverlayProps {
  open: boolean
  analyser: AnalyserNode | null
  activeNoteCount: number
  /** Живой SUB-патч студии — те же ручки/энкодеры, что крутят звук, двигают и граф */
  patchRef?: RefObject<SubtractivePatch>
  /** Счётчик ударов ноты/пэда — резкая вспышка-пульс графа синхронно с атакой */
  pulseRef?: RefObject<number>
  /** Счётчик четвертных долей активного секвенсора — устойчивый «пульс на бит», синхронный с BPM */
  beatRef?: RefObject<number>
  onClose: () => void
}

const buttonStyle = {
  padding: '4px 10px',
  fontSize: '11px',
  borderRadius: '4px',
  border: '1px solid #5a3a10',
  background: 'rgba(14, 10, 0, 0.6)',
  color: '#D4AF37',
  cursor: 'pointer',
  letterSpacing: '0.06em',
} as const

/**
 * Полноэкранный VJ-оверлей — визуал поверх всей студии, для живого выступления
 * (второй экран/проектор). Escape или клик по крестику закрывает; кнопка ⛶ пытается
 * запросить настоящий Fullscreen API браузера (полезно при выводе на проектор).
 *
 * Источник звука для графа переключаемый: своя студия (по умолчанию) или внешний
 * микрофон/линейный вход — на вечеринке/фаершоу реагировать нужно на чужую музыку,
 * не свою (см. `use-external-audio-input.ts`).
 */
export function VjOverlay({ open, analyser, activeNoteCount, patchRef, pulseRef, beatRef, onClose }: VjOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const external = useExternalAudioInput()

  // Активная визуальная сцена — ref для чтения внутри rAF-цикла графа (без пересоздания эффекта
  // на переключение), state параллельно — только чтобы подсветить выбранную кнопку в UI.
  const [sceneId, setSceneId] = useState(DEFAULT_VJ_SCENE.id)
  const sceneRef = useRef(DEFAULT_VJ_SCENE)
  const handleSceneSelect = (id: string) => {
    const scene = VJ_SCENES.find((s) => s.id === id)
    if (!scene) {
      return
    }
    sceneRef.current = scene
    setSceneId(id)
  }

  useEffect(() => {
    if (!open) {
      return
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open && document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)
    }
  }, [open])

  if (!open) {
    return null
  }

  const handleFullscreen = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => undefined)
    } else {
      void containerRef.current?.requestFullscreen().catch(() => undefined)
    }
  }

  const activeAnalyser = external.active ? external.analyser : analyser

  return (
    <Box ref={containerRef} position="fixed" inset={0} zIndex={100} bg="void.950">
      <SpinGraphCanvas
        analyser={activeAnalyser}
        activeNoteCount={activeNoteCount}
        patchRef={patchRef}
        pulseRef={pulseRef}
        beatRef={beatRef}
        sceneRef={sceneRef}
      />

      {/* Визуальные сцены — куратoрские пресеты «настроения» графа (scenes.ts), не другой рендер */}
      <Box position="absolute" top={4} left={4} display="flex" alignItems="center" gap={1}>
        {VJ_SCENES.map((scene) => (
          <Box asChild key={scene.id}>
            <button
              onClick={() => handleSceneSelect(scene.id)}
              title={scene.mood}
              style={
                scene.id === sceneId
                  ? {
                      ...buttonStyle,
                      border: '1px solid #D4AF37',
                      color: '#F5D85A',
                      background: 'rgba(58, 46, 8, 0.7)',
                    }
                  : buttonStyle
              }
            >
              {scene.name}
            </button>
          </Box>
        ))}
      </Box>

      <Box position="absolute" top={4} right={4} display="flex" alignItems="center" gap={2}>
        {external.devices.length === 0 ? (
          <Box asChild>
            <button onClick={() => void external.refreshDevices()} style={buttonStyle}>
              🎤 внешний вход
            </button>
          </Box>
        ) : (
          <>
            <Box asChild>
              <select
                value={external.selectedDeviceId ?? ''}
                onChange={(e) => external.setSelectedDeviceId(e.target.value)}
                style={{ ...buttonStyle, cursor: 'pointer' }}
              >
                {external.devices.map((d) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label}
                  </option>
                ))}
              </select>
            </Box>
            <Box asChild>
              <button onClick={external.toggle} style={buttonStyle}>
                {external.active ? '● отключить вход' : '● подключить вход'}
              </button>
            </Box>
          </>
        )}
        <Box asChild>
          <button onClick={handleFullscreen} style={buttonStyle}>
            ⛶ во весь экран
          </button>
        </Box>
        <Box asChild>
          <button onClick={onClose} style={buttonStyle}>
            ✕ выход (Esc)
          </button>
        </Box>
      </Box>

      {external.error && (
        <Text position="absolute" top={16} right={4} fontSize="10px" color="red.400" maxW="240px" textAlign="right">
          {external.error}
        </Text>
      )}

      <Text
        position="absolute"
        bottom={4}
        left="50%"
        transform="translateX(-50%)"
        fontSize="9px"
        color="fg.subtle"
        letterSpacing="0.1em"
      >
        VJ-режим · {external.active ? 'реактивно к внешнему звуку' : 'реактивно к звуку студии'}
      </Text>
    </Box>
  )
}
