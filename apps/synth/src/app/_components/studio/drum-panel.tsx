'use client'

import type { DrumPad, DrumPadSynth } from '@/lib/patch/schema'
import { Box, Text } from '@chakra-ui/react'
import { filledToggleStyle } from './button-style'
import { Knob } from './knob'

const SYNTH_TYPES: DrumPadSynth['type'][] = ['808kick', 'tom', 'snare', 'clap', 'hat-closed', 'hat-open']
const TYPE_LABEL: Record<DrumPadSynth['type'], string> = {
  '808kick': 'Kick',
  tom: 'Tom',
  snare: 'Snare',
  clap: 'Clap',
  'hat-closed': 'Hat Cl',
  'hat-open': 'Hat Op',
}

function btnStyle(active: boolean): React.CSSProperties {
  return filledToggleStyle(active, { padding: '3px 8px', letterSpacing: '0.03em' })
}

function defaultSynth(type: DrumPadSynth['type']): DrumPadSynth {
  return { type, pitch: 60, decay: 0.3, tone: 0.5, level: 0.8 }
}

interface DrumPanelProps {
  pad: DrumPad
  onChange: (pad: DrumPad) => void
}

export function DrumPanel({ pad, onChange }: DrumPanelProps) {
  const synth = pad.synth
  const setSynth = (s: DrumPadSynth) => onChange({ ...pad, synth: s })

  return (
    <Box bg="bg.surface" border="1px solid" borderColor="border.DEFAULT" borderRadius="md" p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Text fontSize="9px" fontWeight="600" letterSpacing="0.12em" color="fg.gold" textTransform="uppercase">
          Пэд {pad.index + 1} — {pad.name}
        </Text>
        {synth && (
          <button style={btnStyle(false)} onClick={() => onChange({ ...pad, synth: null })}>
            Очистить
          </button>
        )}
      </Box>

      <Box display="flex" gap={1} flexWrap="wrap" mb={synth ? 3 : 0}>
        {SYNTH_TYPES.map((type) => (
          <button
            key={type}
            style={btnStyle(synth?.type === type)}
            onClick={() => setSynth(synth ? { ...synth, type } : defaultSynth(type))}
          >
            {TYPE_LABEL[type]}
          </button>
        ))}
      </Box>

      {synth && (
        <Box display="flex" gap={3} flexWrap="wrap">
          <Knob
            label="pitch"
            value={synth.pitch / 127}
            onChange={(v) => setSynth({ ...synth, pitch: Math.round(v * 127) })}
            displayValue={`${synth.pitch}`}
            hint="Базовая нота удара — ниже гудит, выше звенит."
            size={40}
          />
          <Knob
            label="decay"
            value={synth.decay / 5}
            onChange={(v) => setSynth({ ...synth, decay: Math.round(v * 5 * 100) / 100 })}
            displayValue={`${synth.decay.toFixed(2)}s`}
            hint="Время затухания — как долго звучит удар."
            size={40}
          />
          <Knob
            label="tone"
            value={synth.tone}
            onChange={(v) => setSynth({ ...synth, tone: Math.round(v * 100) / 100 })}
            displayValue={`${Math.round(synth.tone * 100)}%`}
            hint="Характер удара: у кика/тома — резкость атаки, у снейра — доля треска, у хэта/клэпа — яркость."
            size={40}
          />
          <Knob
            label="level"
            value={synth.level}
            onChange={(v) => setSynth({ ...synth, level: Math.round(v * 100) / 100 })}
            displayValue={`${Math.round(synth.level * 100)}%`}
            hint="Громкость этого пэда."
            size={40}
          />
        </Box>
      )}
    </Box>
  )
}
