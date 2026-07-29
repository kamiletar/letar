'use client'

import type { DrumPad } from '@/lib/patch/schema'
import { Box, Text } from '@chakra-ui/react'
import { filledToggleStyle, outlineButtonStyle } from './button-style'
import { SEQUENCER_STEPS } from './use-drum-sequencer'

interface SequencerPanelProps {
  pads: DrumPad[]
  pattern: boolean[][]
  currentStep: number
  isPlaying: boolean
  bpm: number
  onToggleStep: (padIndex: number, stepIndex: number) => void
  onToggle: () => void
  onBpmChange: (bpm: number) => void
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

function cellStyle(filled: boolean, isPlayhead: boolean, groupStart: boolean): React.CSSProperties {
  return {
    ...filledToggleStyle(filled, { padding: '0' }),
    width: '16px',
    height: '16px',
    minWidth: '16px',
    marginLeft: groupStart ? '4px' : 0,
    border: isPlayhead ? '1px solid #4FA8FF' : `1px solid ${filled ? '#D4AF37' : '#2A2018'}`,
    boxShadow: isPlayhead ? '0 0 6px #4FA8FF88' : 'none',
  }
}

// Степ-секвенсор драм-кита: пэд-строка × 16 шагов. Показывает только назначенные пэды —
// пустые заготовки под будущие сэмплы не участвуют в ритме.
export function SequencerPanel({
  pads,
  pattern,
  currentStep,
  isPlaying,
  bpm,
  onToggleStep,
  onToggle,
  onBpmChange,
  onClear,
}: SequencerPanelProps) {
  const soundedPads = pads.filter((pad) => pad.synth !== null)

  return (
    <Box bg="bg.surface" border="1px solid" borderColor="border.DEFAULT" borderRadius="md" p={3}>
      <Box display="flex" alignItems="center" gap={3} mb={2}>
        <Text fontSize="9px" fontWeight="600" letterSpacing="0.12em" color="fg.gold" textTransform="uppercase">
          Секвенсор
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
        <button style={outlineButtonStyle('default', { padding: '3px 8px' })} onClick={onClear}>
          очистить
        </button>
      </Box>

      <Box display="flex" flexDir="column" gap="2px">
        {soundedPads.map((pad) => (
          <Box key={pad.index} display="flex" alignItems="center" gap={1}>
            <Text fontSize="8px" color="fg.muted" letterSpacing="0.02em" w="64px" lineClamp={1}>
              {pad.name}
            </Text>
            <Box display="flex">
              {Array.from({ length: SEQUENCER_STEPS }, (_, step) => (
                <button
                  key={step}
                  style={cellStyle(pattern[pad.index][step], isPlaying && currentStep === step, step % 4 === 0)}
                  onClick={() => onToggleStep(pad.index, step)}
                />
              ))}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  )
}
