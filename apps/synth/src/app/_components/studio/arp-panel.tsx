'use client'

import type { ArpeggiatorParams, ArpMode } from '@/lib/patch/schema'
import { Box, Text } from '@chakra-ui/react'
import { filledToggleStyle, outlineButtonStyle } from './button-style'

interface ArpPanelProps {
  params: ArpeggiatorParams
  onChange: (updater: (prev: ArpeggiatorParams) => ArpeggiatorParams) => void
  onToggleEnabled: () => void
}

const MODES: { value: ArpMode; label: string }[] = [
  { value: 'up', label: '↑ вверх' },
  { value: 'down', label: '↓ вниз' },
  { value: 'up-down', label: '↕ туда-обратно' },
  { value: 'random', label: '⚄ случайно' },
]

const DIVISIONS: { value: number; label: string }[] = [
  { value: 4, label: '1/4' },
  { value: 2, label: '1/8' },
  { value: 1, label: '1/16' },
]

const smallInputStyle: React.CSSProperties = {
  width: '52px',
  padding: '2px 6px',
  fontSize: '11px',
  borderRadius: '3px',
  border: '1px solid #5a3a10',
  background: 'transparent',
  color: '#EEC835',
}

// Арпеджиатор: держишь аккорд на клавиатуре/MIDI — вместо аккорда звучит бегущая по нотам
// последовательность. Настройки живут в патче (как и секвенсор драм-кита/пиано-ролл).
export function ArpPanel({ params, onChange, onToggleEnabled }: ArpPanelProps) {
  return (
    <Box bg="bg.surface" border="1px solid" borderColor="border.DEFAULT" borderRadius="md" p={3}>
      <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
        <Text fontSize="9px" fontWeight="600" letterSpacing="0.12em" color="fg.gold" textTransform="uppercase">
          Арпеджиатор
        </Text>
        <button
          style={outlineButtonStyle(params.enabled ? 'active' : 'default', { padding: '3px 10px' })}
          onClick={onToggleEnabled}
        >
          {params.enabled ? '● вкл' : '○ выкл'}
        </button>

        <Box display="flex" gap={1}>
          {MODES.map((m) => (
            <button
              key={m.value}
              style={filledToggleStyle(params.mode === m.value, { padding: '3px 6px', fontSize: '9px' })}
              onClick={() => onChange((prev) => ({ ...prev, mode: m.value }))}
            >
              {m.label}
            </button>
          ))}
        </Box>

        <Box display="flex" gap={1}>
          {DIVISIONS.map((d) => (
            <button
              key={d.value}
              style={filledToggleStyle(params.stepsPerNote === d.value, { padding: '3px 6px', fontSize: '9px' })}
              onClick={() => onChange((prev) => ({ ...prev, stepsPerNote: d.value }))}
            >
              {d.label}
            </button>
          ))}
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <Text fontSize="9px" color="fg.subtle">
            октав
          </Text>
          <input
            type="number"
            value={params.octaves}
            min={1}
            max={3}
            style={smallInputStyle}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, octaves: Math.max(1, Math.min(3, Number(e.target.value) || 1)) }))}
          />
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <Text
            fontSize="9px"
            color="fg.subtle"
            title="Доля шага, которую звучит нота — меньше значение, суше и «стаккатнее» бег"
          >
            гейт
          </Text>
          <input
            type="range"
            min={5}
            max={100}
            value={Math.round(params.gate * 100)}
            style={{ width: '60px' }}
            onChange={(e) => onChange((prev) => ({ ...prev, gate: Number(e.target.value) / 100 }))}
          />
        </Box>

        <Box display="flex" alignItems="center" gap={1}>
          <Text fontSize="9px" color="fg.subtle">
            BPM
          </Text>
          <input
            type="number"
            value={params.bpm}
            min={40}
            max={240}
            style={smallInputStyle}
            onChange={(e) =>
              onChange((prev) => ({ ...prev, bpm: Math.max(40, Math.min(240, Number(e.target.value) || prev.bpm)) }))}
          />
        </Box>
      </Box>
    </Box>
  )
}
