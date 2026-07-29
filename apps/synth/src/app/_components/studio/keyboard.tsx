'use client'

import { isBlackKey, KEYBOARD_OCTAVES, KEYBOARD_START_NOTE, midiNoteName } from '@/lib/audio/midi'
import { Box } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'

const START_NOTE = KEYBOARD_START_NOTE
const NUM_OCTAVES = KEYBOARD_OCTAVES
const TOTAL_KEYS = 12 * NUM_OCTAVES

const WHITE_KEY_W = 34 // px
const WHITE_KEY_H = 120
const BLACK_KEY_W = 22
const BLACK_KEY_H = 74

// Смещение чёрной клавиши относительно начала белой слева (доля WIDTH белой)
const BLACK_OFFSET: Record<number, number> = { 1: 0.63, 3: 1.63, 6: 3.63, 8: 4.63, 10: 5.63 }

// Клавиши компьютера → MIDI-смещение от START_NOTE
const QWERTY_MAP: Record<string, number> = {
  a: 0,
  w: 1,
  s: 2,
  e: 3,
  d: 4,
  f: 5,
  t: 6,
  g: 7,
  y: 8,
  h: 9,
  u: 10,
  j: 11,
  k: 12,
  o: 13,
  l: 14,
  p: 15,
  ';': 16,
}

interface KeyboardProps {
  onNoteOn: (midiNote: number, velocity: number) => void
  onNoteOff: (midiNote: number) => void
  activeNotes?: Set<number>
}

export function Keyboard({ onNoteOn, onNoteOff, activeNotes = new Set() }: KeyboardProps) {
  const pressedKeys = useRef<Set<number>>(new Set())

  // Сбрасываем ноты при размонтировании
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const handleNoteOn = useCallback(
    (note: number) => {
      if (pressedKeys.current.has(note)) {
        return
      }
      pressedKeys.current.add(note)
      onNoteOn(note, 0.8)
    },
    [onNoteOn]
  )

  const handleNoteOff = useCallback(
    (note: number) => {
      pressedKeys.current.delete(note)
      onNoteOff(note)
    },
    [onNoteOff]
  )

  // Клавиши компьютера
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat) {
        return
      }
      const offset = QWERTY_MAP[e.key]
      if (offset !== undefined) {
        handleNoteOn(START_NOTE + offset)
      }
    }
    const up = (e: KeyboardEvent) => {
      const offset = QWERTY_MAP[e.key]
      if (offset !== undefined) {
        handleNoteOff(START_NOTE + offset)
      }
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [handleNoteOn, handleNoteOff])

  // Список нот
  const notes = Array.from({ length: TOTAL_KEYS }, (_, i) => START_NOTE + i)
  const whiteNotes = notes.filter((n) => !isBlackKey(n))

  const totalWidth = whiteNotes.length * WHITE_KEY_W

  return (
    <Box position="relative" w={`${totalWidth}px`} h={`${WHITE_KEY_H}px`} mx="auto" flexShrink={0}>
      {/* Белые клавиши */}
      {whiteNotes.map((note, i) => {
        const active = activeNotes.has(note)
        return (
          <Box
            key={note}
            position="absolute"
            left={`${i * WHITE_KEY_W}px`}
            top={0}
            w={`${WHITE_KEY_W - 2}px`}
            h={`${WHITE_KEY_H}px`}
            bg={active ? '#5A4810' : '#201814'}
            border="1px solid"
            borderColor={active ? 'accent.DEFAULT' : 'border.DEFAULT'}
            borderRadius="0 0 4px 4px"
            cursor="pointer"
            boxShadow={active ? '0 0 8px #D4AF3766' : 'none'}
            transition="background 0.05s, box-shadow 0.05s"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              handleNoteOn(note)
            }}
            onPointerUp={() => handleNoteOff(note)}
            onPointerLeave={() => {
              if (pressedKeys.current.has(note)) {
                handleNoteOff(note)
              }
            }}
            _after={{
              content: `"${midiNoteName(note)}"`,
              position: 'absolute',
              bottom: '6px',
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: '8px',
              color: active ? 'accent.emphasized' : 'fg.subtle',
              letterSpacing: '0.03em',
              pointerEvents: 'none',
            }}
          />
        )
      })}

      {/* Чёрные клавиши — поверх белых */}
      {notes
        .filter((n) => isBlackKey(n))
        .map((note) => {
          const semitone = note % 12
          const octaveIndex = Math.floor((note - START_NOTE) / 12)
          // 7 белых клавиш на октаву × смещение октавы + смещение чёрной внутри октавы
          const whiteOffset = WHITE_KEY_W * 7 * octaveIndex + BLACK_OFFSET[semitone] * WHITE_KEY_W
          const active = activeNotes.has(note)
          return (
            <Box
              key={note}
              position="absolute"
              left={`${whiteOffset}px`}
              top={0}
              w={`${BLACK_KEY_W}px`}
              h={`${BLACK_KEY_H}px`}
              bg={active ? '#3A2E08' : '#040302'}
              border="1px solid"
              borderColor={active ? 'accent.DEFAULT' : '#160E0A'}
              borderRadius="0 0 3px 3px"
              cursor="pointer"
              zIndex={1}
              boxShadow={active ? '0 0 6px #D4AF3788' : '0 2px 4px rgba(0,0,0,0.6)'}
              transition="background 0.05s, box-shadow 0.05s"
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId)
                handleNoteOn(note)
              }}
              onPointerUp={() => handleNoteOff(note)}
              onPointerLeave={() => {
                if (pressedKeys.current.has(note)) {
                  handleNoteOff(note)
                }
              }}
            />
          )
        })}
    </Box>
  )
}
