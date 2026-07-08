'use client'

import type { DrumPad } from '@/lib/patch/schema'
import { Box, Text } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'

// Клавиши компьютера → индекс пэда (4×4, ряды снизу вверх — как раскладка MPC)
const QWERTY_MAP: Record<string, number> = {
  z: 0,
  x: 1,
  c: 2,
  v: 3,
  a: 4,
  s: 5,
  d: 6,
  f: 7,
  q: 8,
  w: 9,
  e: 10,
  r: 11,
  '1': 12,
  '2': 13,
  '3': 14,
  '4': 15,
}

interface DrumPadsProps {
  pads: DrumPad[]
  selectedIndex: number
  activePads: Set<number>
  onSelect: (index: number) => void
  onHit: (index: number, velocity: number) => void
}

export function DrumPads({ pads, selectedIndex, activePads, onSelect, onHit }: DrumPadsProps) {
  const pressedKeys = useRef<Set<string>>(new Set())

  const handleHit = useCallback(
    (index: number) => {
      onSelect(index)
      if (pads[index].synth) {
        onHit(index, 0.85)
      }
    },
    [pads, onSelect, onHit]
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || pressedKeys.current.has(e.key)) {
        return
      }
      const index = QWERTY_MAP[e.key]
      if (index !== undefined) {
        pressedKeys.current.add(e.key)
        handleHit(index)
      }
    }
    const up = (e: KeyboardEvent) => {
      pressedKeys.current.delete(e.key)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [handleHit])

  // Ряды сверху вниз: 12–15, 8–11, 4–7, 0–3 (индекс 0 — левый нижний, как на MPC)
  const rows = [
    [12, 13, 14, 15],
    [8, 9, 10, 11],
    [4, 5, 6, 7],
    [0, 1, 2, 3],
  ]

  return (
    <Box display="flex" flexDir="column" gap={2}>
      {rows.map((row, ri) => (
        <Box key={ri} display="flex" gap={2}>
          {row.map((index) => {
            const pad = pads[index]
            const active = activePads.has(index)
            const selected = selectedIndex === index
            const empty = !pad.synth
            return (
              <Box
                key={index}
                w="72px"
                h="52px"
                display="flex"
                flexDir="column"
                alignItems="center"
                justifyContent="center"
                borderRadius="md"
                border="1px solid"
                borderColor={selected ? 'accent.DEFAULT' : active ? '#D4AF37' : 'border.DEFAULT'}
                bg={active ? '#3A2E08' : empty ? '#0A0806' : '#150F0A'}
                cursor={empty ? 'default' : 'pointer'}
                opacity={empty ? 0.4 : 1}
                boxShadow={active ? '0 0 10px #D4AF3766' : 'none'}
                transition="background 0.05s, box-shadow 0.05s"
                onPointerDown={() => handleHit(index)}
              >
                <Text fontSize="8px" color="fg.subtle" letterSpacing="0.04em">
                  {index + 1}
                </Text>
                <Text
                  fontSize="9px"
                  color={selected ? 'fg.gold' : 'fg.muted'}
                  letterSpacing="0.02em"
                  textAlign="center"
                  px={1}
                  lineClamp={1}
                >
                  {pad.name}
                </Text>
              </Box>
            )
          })}
        </Box>
      ))}
    </Box>
  )
}
