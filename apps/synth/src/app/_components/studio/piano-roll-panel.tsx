'use client'

import { isBlackKey, KEYBOARD_OCTAVES, KEYBOARD_START_NOTE } from '@/lib/audio/midi'
import type { MelodicNote } from '@/lib/patch/schema'
import { Box, Text } from '@chakra-ui/react'
import { outlineButtonStyle } from './button-style'

// Тот же диапазон, что у виртуальной клавиатуры (Keyboard)
const START_NOTE = KEYBOARD_START_NOTE
const NUM_OCTAVES = KEYBOARD_OCTAVES
// Сверху вниз — высокие ноты вверху, как на нотном стане, но без подписей нот («цвет вместо нот»,
// см. PLAN.md — глаз ориентируется по светлым/тёмным полосам чёрных/белых клавиш, как на самой
// клавиатуре под этой панелью, а не по текстовым именам).
const ROWS = Array.from({ length: 12 * NUM_OCTAVES }, (_, i) => START_NOTE + 12 * NUM_OCTAVES - 1 - i)

interface PianoRollPanelProps {
  notes: MelodicNote[]
  steps: number
  currentStep: number
  isPlaying: boolean
  bpm: number
  swing: number
  onToggleCell: (note: number, step: number) => void
  onToggle: () => void
  onBpmChange: (bpm: number) => void
  onSwingChange: (swing: number) => void
  onClear: () => void
}

const inputStyle: React.CSSProperties = {
  width: '52px',
  padding: '2px 6px',
  fontSize: '11px',
  borderRadius: '3px',
  border: '1px solid #5a3a10',
  background: 'transparent',
  color: '#EEC835',
}

function cellStyle(
  filled: boolean,
  isPlayhead: boolean,
  isBlackRow: boolean,
  groupStart: boolean
): React.CSSProperties {
  return {
    width: '14px',
    height: '9px',
    minWidth: '14px',
    padding: 0,
    marginLeft: groupStart ? '3px' : 0,
    background: filled ? '#D4AF37' : isBlackRow ? '#140F0A' : '#1C140C',
    border: isPlayhead ? '1px solid #4FA8FF' : `1px solid ${filled ? '#D4AF37' : '#2A2018'}`,
    boxShadow: isPlayhead ? '0 0 4px #4FA8FF88' : 'none',
    cursor: 'pointer',
  }
}

// Пиано-ролл для SUB/FM-патчей: строки — высота, столбцы — шаги. Клик по ячейке создаёт ноту,
// повторные клики удлиняют её (1→2→4 шага), следующий клик удаляет — см. use-piano-roll.ts.
export function PianoRollPanel({
  notes,
  steps,
  currentStep,
  isPlaying,
  bpm,
  swing,
  onToggleCell,
  onToggle,
  onBpmChange,
  onSwingChange,
  onClear,
}: PianoRollPanelProps) {
  const cellAt = (note: number, step: number): MelodicNote | undefined =>
    notes.find((n) => n.note === note && step >= n.step && step < n.step + n.length)

  return (
    <Box bg="bg.surface" border="1px solid" borderColor="border.DEFAULT" borderRadius="md" p={3}>
      <Box display="flex" alignItems="center" gap={3} mb={2} flexWrap="wrap">
        <Text fontSize="9px" fontWeight="600" letterSpacing="0.12em" color="fg.gold" textTransform="uppercase">
          Пиано-ролл
        </Text>
        <button
          style={outlineButtonStyle(isPlaying ? 'active' : 'default', { padding: '3px 10px' })}
          onClick={onToggle}
        >
          {isPlaying ? '■ стоп' : '▶ игра'}
        </button>
        <Box display="flex" alignItems="center" gap={1}>
          <Text fontSize="9px" color="fg.subtle">
            BPM
          </Text>
          <input
            type="number"
            value={bpm}
            min={40}
            max={240}
            style={inputStyle}
            onChange={(e) => onBpmChange(Number(e.target.value) || bpm)}
          />
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Text fontSize="9px" color="fg.subtle" title="Смещение нечётных шагов — «покачивание» ритма">
            свинг
          </Text>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(swing * 100)}
            style={{ width: '52px' }}
            onChange={(e) => onSwingChange(Number(e.target.value) / 100)}
          />
        </Box>
        <button style={outlineButtonStyle('default', { padding: '3px 8px' })} onClick={onClear}>
          очистить
        </button>
      </Box>

      <Box display="flex" flexDir="column" gap="1px" maxH="220px" overflowY="auto">
        {ROWS.map((note) => (
          <Box key={note} display="flex">
            {Array.from({ length: steps }, (_, step) => {
              const cell = cellAt(note, step)
              return (
                <button
                  key={step}
                  style={cellStyle(
                    cell !== undefined,
                    isPlaying && currentStep === step,
                    isBlackKey(note),
                    step % 4 === 0
                  )}
                  onClick={() => onToggleCell(note, step)}
                />
              )
            })}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
