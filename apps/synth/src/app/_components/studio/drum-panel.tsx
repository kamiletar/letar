'use client'

import type { DrumPad, DrumPadSynth } from '@/lib/patch/schema'
import { Box, Text } from '@chakra-ui/react'
import type { ChangeEvent } from 'react'
import { useRef } from 'react'
import { filledToggleStyle, outlineButtonStyle } from './button-style'
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
  onUploadSample: (file: File) => void
  onRemoveSample: (sampleId: string) => void
}

export function DrumPanel({ pad, onChange, onUploadSample, onRemoveSample }: DrumPanelProps) {
  const synth = pad.synth
  const sample = pad.sample
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Синтез и сэмпл взаимоисключающи (см. DrumPadSampleSchema в schema.ts) — выбор одного гасит другой.
  const setSynth = (s: DrumPadSynth) => onChange({ ...pad, synth: s, sample: null })
  const setSample = (s: NonNullable<DrumPad['sample']>) => onChange({ ...pad, synth: null, sample: s })

  const handleFilePicked = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (file) {
      onUploadSample(file)
    }
  }

  const handleClearAll = () => {
    if (sample) {
      onRemoveSample(sample.sampleId)
    }
    onChange({ ...pad, synth: null, sample: null })
  }

  return (
    <Box bg="bg.surface" border="1px solid" borderColor="border.DEFAULT" borderRadius="md" p={3}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Text fontSize="9px" fontWeight="600" letterSpacing="0.12em" color="fg.gold" textTransform="uppercase">
          Пэд {pad.index + 1} — {pad.name}
        </Text>
        {(synth || sample) && (
          <button style={btnStyle(false)} onClick={handleClearAll}>
            Очистить
          </button>
        )}
      </Box>

      <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
        {SYNTH_TYPES.map((type) => (
          <button
            key={type}
            style={btnStyle(!sample && synth?.type === type)}
            onClick={() => setSynth(synth ? { ...synth, type } : defaultSynth(type))}
          >
            {TYPE_LABEL[type]}
          </button>
        ))}
      </Box>

      {synth && !sample && (
        <Box display="flex" gap={3} flexWrap="wrap" mb={3}>
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

      <Box borderTop="1px solid" borderColor="border.DEFAULT" pt={2}>
        <Box display="flex" alignItems="center" gap={2} mb={sample ? 2 : 0}>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFilePicked}
            style={{ display: 'none' }}
          />
          <button
            style={outlineButtonStyle('default', { padding: '3px 8px', letterSpacing: '0.03em' })}
            onClick={() => fileInputRef.current?.click()}
          >
            ↑ сэмпл
          </button>
          {sample && (
            <Text fontSize="9px" color="fg.gold" letterSpacing="0.02em" lineClamp={1}>
              {sample.name}
            </Text>
          )}
        </Box>
        {sample && (
          <Box display="flex" gap={3} flexWrap="wrap">
            <Knob
              label="gain"
              value={sample.gain / 2}
              onChange={(v) => setSample({ ...sample, gain: Math.round(v * 2 * 100) / 100 })}
              displayValue={`${Math.round(sample.gain * 100)}%`}
              hint="Громкость сэмпла — свой уровень поверх силы удара."
              size={40}
            />
            <Knob
              label="pitch"
              value={(sample.pitch - 0.25) / 3.75}
              onChange={(v) => setSample({ ...sample, pitch: Math.round((0.25 + v * 3.75) * 100) / 100 })}
              displayValue={`×${sample.pitch.toFixed(2)}`}
              hint="Скорость воспроизведения — грубый питч-шифт сэмпла (ниже/выше и медленнее/быстрее)."
              size={40}
            />
          </Box>
        )}
      </Box>
    </Box>
  )
}
