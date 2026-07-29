'use client'

import { Box, Text } from '@chakra-ui/react'
import { useEffect, useRef } from 'react'
import { SpinGraphCanvas } from './spin-graph-canvas'

interface VjOverlayProps {
  open: boolean
  analyser: AnalyserNode | null
  activeNoteCount: number
  onClose: () => void
}

/**
 * Полноэкранный VJ-оверлей — визуал поверх всей студии, для живого выступления
 * (второй экран/проектор). Escape или клик по крестику закрывает; кнопка ⛶ пытается
 * запросить настоящий Fullscreen API браузера (полезно при выводе на проектор).
 */
export function VjOverlay({ open, analyser, activeNoteCount, onClose }: VjOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)

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

  return (
    <Box ref={containerRef} position="fixed" inset={0} zIndex={100} bg="void.950">
      <SpinGraphCanvas analyser={analyser} activeNoteCount={activeNoteCount} />

      <Box position="absolute" top={4} right={4} display="flex" gap={2}>
        <Box asChild>
          <button
            onClick={handleFullscreen}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid #5a3a10',
              background: 'rgba(14, 10, 0, 0.6)',
              color: '#D4AF37',
              cursor: 'pointer',
              letterSpacing: '0.06em',
            }}
          >
            ⛶ во весь экран
          </button>
        </Box>
        <Box asChild>
          <button
            onClick={onClose}
            style={{
              padding: '4px 10px',
              fontSize: '11px',
              borderRadius: '4px',
              border: '1px solid #5a3a10',
              background: 'rgba(14, 10, 0, 0.6)',
              color: '#D4AF37',
              cursor: 'pointer',
              letterSpacing: '0.06em',
            }}
          >
            ✕ выход (Esc)
          </button>
        </Box>
      </Box>

      <Text
        position="absolute"
        bottom={4}
        left="50%"
        transform="translateX(-50%)"
        fontSize="9px"
        color="fg.subtle"
        letterSpacing="0.1em"
      >
        VJ-режим · реактивно к звуку
      </Text>
    </Box>
  )
}
