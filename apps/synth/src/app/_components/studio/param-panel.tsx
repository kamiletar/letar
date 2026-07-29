'use client'

import { cutoffNormToFreq } from '@/lib/audio/midi'
import { HINTS } from '@/lib/patch/hints'
import type { OscWave, SubtractiveEngineParams } from '@/lib/patch/schema'
import { Box, Grid, Text } from '@chakra-ui/react'
import { filledToggleStyle } from './button-style'
import { Knob } from './knob'

const WAVE_LABEL: Record<OscWave, string> = {
  sine: '∿',
  sawtooth: '⊿',
  square: '⊓',
  triangle: '△',
}
const WAVES: OscWave[] = ['sine', 'sawtooth', 'square', 'triangle']

// Стили активной/неактивной мини-кнопки (CSS-объект для передачи в style)
function btnStyle(active: boolean): React.CSSProperties {
  return filledToggleStyle(active, { padding: '2px 6px', letterSpacing: '0.04em', lineHeight: 1.4 })
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box bg="bg.surface" border="1px solid" borderColor="border.DEFAULT" borderRadius="md" p={3}>
      <Text fontSize="9px" fontWeight="600" letterSpacing="0.12em" color="fg.gold" textTransform="uppercase" mb={3}>
        {title}
      </Text>
      {children}
    </Box>
  )
}

function WaveSelect({ value, onChange }: { value: OscWave; onChange: (w: OscWave) => void }) {
  return (
    <Box display="flex" gap="2px" mb={2}>
      {WAVES.map((w) => (
        <button key={w} style={btnStyle(value === w)} onClick={() => onChange(w)} title={w}>
          {WAVE_LABEL[w]}
        </button>
      ))}
    </Box>
  )
}

function KnobRow({ children }: { children: React.ReactNode }) {
  return (
    <Box display="flex" gap={4} flexWrap="wrap">
      {children}
    </Box>
  )
}

interface ParamPanelProps {
  engine: SubtractiveEngineParams
  onChange: (e: SubtractiveEngineParams) => void
}

function patchEngine<K extends keyof SubtractiveEngineParams>(
  engine: SubtractiveEngineParams,
  key: K,
  value: SubtractiveEngineParams[K]
): SubtractiveEngineParams {
  return { ...engine, [key]: value }
}

export function ParamPanel({ engine, onChange }: ParamPanelProps) {
  const setOsc1 = (k: string, v: number | string) => onChange(patchEngine(engine, 'osc1', { ...engine.osc1, [k]: v }))
  const setOsc2 = (k: string, v: number | string) => onChange(patchEngine(engine, 'osc2', { ...engine.osc2, [k]: v }))
  const setFilter = (k: string, v: number | string) =>
    onChange(patchEngine(engine, 'filter', { ...engine.filter, [k]: v }))
  const setFilterAdsr = (k: string, v: number) =>
    onChange(patchEngine(engine, 'filter', { ...engine.filter, adsr: { ...engine.filter.adsr, [k]: v } }))
  const setAmpAdsr = (k: string, v: number) =>
    onChange(patchEngine(engine, 'amp', { ...engine.amp, adsr: { ...engine.amp.adsr, [k]: v } }))
  const setLfo = (k: string, v: number | string) => onChange(patchEngine(engine, 'lfo', { ...engine.lfo, [k]: v }))
  const setFxReverb = (k: 'wet' | 'decay', v: number) =>
    onChange(patchEngine(engine, 'fx', { ...engine.fx, reverb: { ...engine.fx.reverb, [k]: v } }))
  const setFxSpace = (k: 'azimuth' | 'depth' | 'autoOrbit' | 'orbitRate', v: number | boolean) =>
    onChange(patchEngine(engine, 'fx', { ...engine.fx, space: { ...engine.fx.space, [k]: v } }))

  const cutoffHz = Math.round(cutoffNormToFreq(engine.filter.cutoff))
  const cutoffDisplay = cutoffHz < 1000 ? `${cutoffHz}Hz` : `${(cutoffHz / 1000).toFixed(1)}k`

  return (
    <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={3}>
      {/* OSC 1 */}
      <Section title="OSC 1">
        <WaveSelect value={engine.osc1.wave} onChange={(w) => setOsc1('wave', w)} />
        <KnobRow>
          <Knob
            label="detune"
            value={(engine.osc1.detune + 100) / 200}
            onChange={(v) => setOsc1('detune', Math.round(v * 200 - 100))}
            displayValue={`${engine.osc1.detune > 0 ? '+' : ''}${engine.osc1.detune}¢`}
            hint={HINTS['osc.detune']}
          />
          <Knob
            label="gain"
            value={engine.osc1.gain}
            onChange={(v) => setOsc1('gain', Math.round(v * 100) / 100)}
            displayValue={`${Math.round(engine.osc1.gain * 100)}%`}
            hint={HINTS['osc.gain']}
          />
          <Knob
            label="octave"
            value={(engine.osc1.octave + 2) / 4}
            onChange={(v) => setOsc1('octave', Math.round(v * 4 - 2))}
            displayValue={`${engine.osc1.octave > 0 ? '+' : ''}${engine.osc1.octave}`}
            hint={HINTS['osc.octave']}
          />
        </KnobRow>
      </Section>

      {/* OSC 2 */}
      <Section title="OSC 2">
        <WaveSelect value={engine.osc2.wave} onChange={(w) => setOsc2('wave', w)} />
        <KnobRow>
          <Knob
            label="detune"
            value={(engine.osc2.detune + 100) / 200}
            onChange={(v) => setOsc2('detune', Math.round(v * 200 - 100))}
            displayValue={`${engine.osc2.detune > 0 ? '+' : ''}${engine.osc2.detune}¢`}
            hint={HINTS['osc.detune']}
          />
          <Knob
            label="gain"
            value={engine.osc2.gain}
            onChange={(v) => setOsc2('gain', Math.round(v * 100) / 100)}
            displayValue={`${Math.round(engine.osc2.gain * 100)}%`}
            hint={HINTS['osc.gain']}
          />
          <Knob
            label="octave"
            value={(engine.osc2.octave + 2) / 4}
            onChange={(v) => setOsc2('octave', Math.round(v * 4 - 2))}
            displayValue={`${engine.osc2.octave > 0 ? '+' : ''}${engine.osc2.octave}`}
            hint={HINTS['osc.octave']}
          />
        </KnobRow>
      </Section>

      {/* FILTER */}
      <Section title="Filter">
        <Box display="flex" gap="2px" mb={2}>
          {(['lowpass', 'highpass', 'bandpass'] as const).map((t) => (
            <button key={t} style={btnStyle(engine.filter.type === t)} onClick={() => setFilter('type', t)}>
              {t === 'lowpass' ? 'LP' : t === 'highpass' ? 'HP' : 'BP'}
            </button>
          ))}
        </Box>
        <KnobRow>
          <Knob
            label="cutoff"
            value={engine.filter.cutoff}
            onChange={(v) => setFilter('cutoff', Math.round(v * 1000) / 1000)}
            displayValue={cutoffDisplay}
            hint={HINTS['filter.cutoff']}
          />
          <Knob
            label="reso"
            value={engine.filter.resonance / 0.99}
            onChange={(v) => setFilter('resonance', Math.round(v * 0.99 * 100) / 100)}
            displayValue={`${Math.round((engine.filter.resonance / 0.99) * 100)}%`}
            hint={HINTS['filter.resonance']}
          />
          <Knob
            label="env"
            value={(engine.filter.envAmount + 1) / 2}
            onChange={(v) => setFilter('envAmount', Math.round((v * 2 - 1) * 100) / 100)}
            displayValue={`${engine.filter.envAmount > 0 ? '+' : ''}${Math.round(engine.filter.envAmount * 100)}%`}
            hint={HINTS['filter.envAmount']}
          />
        </KnobRow>
        <Text fontSize="8px" color="fg.subtle" letterSpacing="0.08em" mt={2} mb={1}>
          ENV
        </Text>
        <KnobRow>
          {(['attack', 'decay', 'sustain', 'release'] as const).map((k) => (
            <Knob
              key={k}
              label={k[0].toUpperCase()}
              value={k === 'sustain' ? engine.filter.adsr[k] : engine.filter.adsr[k] / 10}
              onChange={(v) => setFilterAdsr(k, k === 'sustain' ? v : Math.round(v * 100) / 10)}
              displayValue={
                k === 'sustain' ? `${Math.round(engine.filter.adsr[k] * 100)}%` : `${engine.filter.adsr[k].toFixed(2)}s`
              }
              hint={HINTS[`adsr.${k}`]}
              size={40}
            />
          ))}
        </KnobRow>
      </Section>

      {/* AMP */}
      <Section title="Amp">
        <KnobRow>
          <Knob
            label="gain"
            value={engine.amp.gain}
            onChange={(v) => onChange(patchEngine(engine, 'amp', { ...engine.amp, gain: Math.round(v * 100) / 100 }))}
            displayValue={`${Math.round(engine.amp.gain * 100)}%`}
            hint={HINTS['amp.gain']}
          />
        </KnobRow>
        <Text fontSize="8px" color="fg.subtle" letterSpacing="0.08em" mt={2} mb={1}>
          ENV
        </Text>
        <KnobRow>
          {(['attack', 'decay', 'sustain', 'release'] as const).map((k) => (
            <Knob
              key={k}
              label={k[0].toUpperCase()}
              value={k === 'sustain' ? engine.amp.adsr[k] : engine.amp.adsr[k] / 10}
              onChange={(v) => setAmpAdsr(k, k === 'sustain' ? v : Math.round(v * 100) / 10)}
              displayValue={
                k === 'sustain' ? `${Math.round(engine.amp.adsr[k] * 100)}%` : `${engine.amp.adsr[k].toFixed(2)}s`
              }
              hint={HINTS[`adsr.${k}`]}
              size={40}
            />
          ))}
        </KnobRow>
      </Section>

      {/* FX */}
      <Section title="FX — Reverb">
        <KnobRow>
          <Knob
            label="wet"
            value={engine.fx.reverb.wet}
            onChange={(v) => setFxReverb('wet', Math.round(v * 100) / 100)}
            displayValue={`${Math.round(engine.fx.reverb.wet * 100)}%`}
            hint={HINTS['fx.reverb.wet']}
          />
          <Knob
            label="decay"
            value={engine.fx.reverb.decay / 8}
            onChange={(v) => setFxReverb('decay', Math.round(v * 80) / 10)}
            displayValue={`${engine.fx.reverb.decay.toFixed(1)}s`}
            hint={HINTS['fx.reverb.decay']}
          />
        </KnobRow>
      </Section>

      {/* FX — Пространство */}
      <Section title="FX — Пространство">
        <KnobRow>
          <Knob
            label="азимут"
            value={(engine.fx.space.azimuth + 1) / 2}
            onChange={(v) => setFxSpace('azimuth', Math.round((v * 2 - 1) * 100) / 100)}
            displayValue={
              engine.fx.space.azimuth === 0
                ? 'центр'
                : `${Math.abs(Math.round(engine.fx.space.azimuth * 90))}° ${engine.fx.space.azimuth < 0 ? 'Л' : 'П'}`
            }
            hint={HINTS['fx.space.azimuth']}
          />
          <Knob
            label="глубина"
            value={engine.fx.space.depth}
            onChange={(v) => setFxSpace('depth', Math.round(v * 100) / 100)}
            displayValue={`${Math.round(engine.fx.space.depth * 100)}%`}
            hint={HINTS['fx.space.depth']}
          />
          <Knob
            label="орбита"
            value={engine.fx.space.orbitRate}
            onChange={(v) => setFxSpace('orbitRate', Math.round(v * 100) / 100)}
            displayValue={`${engine.fx.space.orbitRate.toFixed(2)}/с`}
            hint={HINTS['fx.space.orbitRate']}
          />
        </KnobRow>
        <Box mt={2}>
          <button
            style={btnStyle(engine.fx.space.autoOrbit)}
            onClick={() => setFxSpace('autoOrbit', !engine.fx.space.autoOrbit)}
          >
            {engine.fx.space.autoOrbit ? '● авто-орбита вкл' : '○ авто-орбита выкл'}
          </button>
        </Box>
      </Section>

      {/* LFO */}
      <Section title="LFO">
        <Box display="flex" gap="2px" mb={2}>
          {(['cutoff', 'pitch', 'amp'] as const).map((t) => (
            <button key={t} style={btnStyle(engine.lfo.target === t)} onClick={() => setLfo('target', t)}>
              {t}
            </button>
          ))}
        </Box>
        <WaveSelect value={engine.lfo.wave} onChange={(w) => setLfo('wave', w)} />
        <KnobRow>
          <Knob
            label="rate"
            value={engine.lfo.rate / 20}
            onChange={(v) => setLfo('rate', Math.round(v * 200) / 10)}
            displayValue={`${engine.lfo.rate.toFixed(2)}Hz`}
            hint={HINTS['lfo.rate']}
          />
          <Knob
            label="depth"
            value={engine.lfo.depth}
            onChange={(v) => setLfo('depth', Math.round(v * 100) / 100)}
            displayValue={`${Math.round(engine.lfo.depth * 100)}%`}
            hint={HINTS['lfo.depth']}
          />
        </KnobRow>
      </Section>
    </Grid>
  )
}
