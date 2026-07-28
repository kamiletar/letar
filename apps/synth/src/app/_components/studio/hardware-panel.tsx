'use client'

import { Box, Text } from '@chakra-ui/react'
import { Fader } from './fader'
import { Knob } from './knob'

// Подписи повторяют реальный маппинг из src/lib/patch/midi-mapping.ts — держать в синхроне при правках
const FADER_LABELS_BANK1 = ['cutoff', 'reso', 'attack', 'release']
const FADER_LABELS_BANK2 = ['gain', 'reverb', 'detune 1', 'detune 2']
const ENCODER_LABELS_BANK1 = [
  'detune 1',
  'env amt',
  'lfo rate',
  'lfo depth',
  'gain',
  'reverb wet',
  'reverb decay',
  'detune 2',
]
const ENCODER_LABELS_BANK2 = [
  'osc1 gain',
  'osc2 gain',
  'filt attack',
  'filt release',
  'amp decay',
  'amp sustain',
  'азимут',
  'глубина',
]

// Knob по дизайну интерактивен (перетаскивание мышью); здесь он read-only слепок реального железа —
// сам виджет обёрнут в pointerEvents="none" (см. ниже), но onChange всё равно обязателен по типу
function noop(): void {
  // read-only слепок железа — перетаскивание физически заблокировано pointerEvents="none"
}

interface HardwarePanelProps {
  faderValues: readonly number[]
  faderBank: 1 | 2
  encoderValues: readonly number[]
  encoderBank: 1 | 2
}

/**
 * Зеркало физической панели SMK-37 PRO: 4 фейдера в ряд + 8 энкодеров в ряд, как на самом
 * устройстве — вместо того чтобы искать нужную ручку среди секций OSC/Filter/Amp, видно живьём,
 * какой физический контрол что сейчас крутит. Только отображение (не источник управления).
 */
export function HardwarePanel({ faderValues, faderBank, encoderValues, encoderBank }: HardwarePanelProps) {
  const faderLabels = faderBank === 1 ? FADER_LABELS_BANK1 : FADER_LABELS_BANK2
  const encoderLabels = encoderBank === 1 ? ENCODER_LABELS_BANK1 : ENCODER_LABELS_BANK2

  return (
    <Box bg="bg.surface" border="1px solid" borderColor="border.DEFAULT" borderRadius="md" p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Text fontSize="9px" fontWeight="600" letterSpacing="0.12em" color="fg.gold" textTransform="uppercase">
          Железо — SMK-37 PRO
        </Text>
        <Text fontSize="8px" color="fg.subtle" letterSpacing="0.04em">
          управляет SUB-патчем · FM/DRUM — Фаза 1.5
        </Text>
      </Box>

      <Box display="flex" gap={6} flexWrap="wrap">
        <Box display="flex" flexDir="column" gap={2}>
          <Text fontSize="7px" color="fg.subtle" letterSpacing="0.08em">
            фейдеры · банк {faderBank}
          </Text>
          <Box display="flex" gap={4}>
            {faderValues.map((v, i) => (
              <Fader key={i} value={v} label={faderLabels[i] ?? '—'} />
            ))}
          </Box>
        </Box>

        <Box display="flex" flexDir="column" gap={2}>
          <Text fontSize="7px" color="fg.subtle" letterSpacing="0.08em">
            энкодеры · банк {encoderBank}
          </Text>
          <Box display="flex" gap={2} flexWrap="wrap">
            {encoderValues.map((v, i) => (
              <Box key={i} pointerEvents="none">
                <Knob
                  value={v / 127}
                  onChange={noop}
                  label={encoderLabels[i] ?? '—'}
                  displayValue={`${Math.round((v / 127) * 100)}%`}
                  size={36}
                />
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
