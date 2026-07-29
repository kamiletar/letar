'use client'

import type { AudioInputDevice } from '@/lib/audio/hardware-recorder'
import type { LevelReading } from '@/lib/audio/level-meter'
import type { VoiceChainParams } from '@/lib/audio/voice-chain'
import { HINTS } from '@/lib/patch/hints'
import { Box, Text } from '@chakra-ui/react'
import { outlineButtonStyle } from './button-style'
import { Knob } from './knob'
import { LevelMeterBar } from './level-meter-bar'

interface VoicePanelProps {
  devices: AudioInputDevice[]
  selectedDeviceId: string | null
  onSelectDevice: (id: string) => void
  onRefreshDevices: () => void
  active: boolean
  onToggleActive: () => void
  error: string | null
  params: VoiceChainParams
  onParamsChange: (p: VoiceChainParams) => void
  level: LevelReading
  isRecording: boolean
  recordingUrl: string | null
  onToggleRecording: () => void
}

// dB-диапазоны и обратные преобразования — Knob работает в норме 0..1
const dbToNorm = (db: number, min: number, max: number) => (db - min) / (max - min)
const normToDb = (n: number, min: number, max: number) => min + n * (max - min)

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box bg="bg.surface" border="1px solid" borderColor="border.DEFAULT" borderRadius="md" p={3}>
      <Text fontSize="9px" fontWeight="600" letterSpacing="0.12em" color="fg.gold" textTransform="uppercase" mb={2}>
        {title}
      </Text>
      {children}
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

/**
 * Вокальный тракт (Фаза 5): компрессор выравнивает громкость (никаких страшных скачков),
 * 3-полосный EQ формирует тембр голоса, де-эссер убирает свист «с/ш», send'ы отправляют
 * голос в общую комнату мастер-шины (reverb/delay). Монитор = репетиция: в наушниках то же,
 * что услышит зал.
 */
export function VoicePanel({
  devices,
  selectedDeviceId,
  onSelectDevice,
  onRefreshDevices,
  active,
  onToggleActive,
  error,
  params,
  onParamsChange,
  level,
  isRecording,
  recordingUrl,
  onToggleRecording,
}: VoicePanelProps) {
  const setCompressor = (k: keyof VoiceChainParams['compressor'], v: number) =>
    onParamsChange({ ...params, compressor: { ...params.compressor, [k]: v } })
  const setEq = (k: keyof VoiceChainParams['eq'], v: number) =>
    onParamsChange({ ...params, eq: { ...params.eq, [k]: v } })
  const setDeEsser = (k: keyof VoiceChainParams['deEsser'], v: number | boolean) =>
    onParamsChange({ ...params, deEsser: { ...params.deEsser, [k]: v } })

  return (
    <Box bg="bg.surface" border="1px solid" borderColor="border.subtle" borderRadius="md" p={3}>
      <Text fontSize="9px" fontWeight="600" letterSpacing="0.12em" color="fg.gold" textTransform="uppercase" mb={2}>
        Голос
      </Text>
      <Text fontSize="9px" color="fg.subtle" mb={2}>
        Компрессор придавливает страшные скачки громкости, EQ и де-эссер лепят тембр. Монитор — репетиция: слышишь в
        наушниках то же, что будет на сцене.
      </Text>

      <Box display="flex" alignItems="center" gap={2} flexWrap="wrap" mb={3}>
        {devices.length === 0 ? (
          <button style={outlineButtonStyle('default', { padding: '2px 8px' })} onClick={onRefreshDevices}>
            Выбрать микрофон
          </button>
        ) : (
          <>
            <select
              value={selectedDeviceId ?? ''}
              onChange={(e) => onSelectDevice(e.target.value)}
              style={{
                background: 'transparent',
                border: '1px solid #5a3a10',
                borderRadius: '3px',
                color: '#D4AF37',
                fontSize: '10px',
                padding: '2px 6px',
                fontFamily: 'monospace',
                maxWidth: '220px',
              }}
            >
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label}
                </option>
              ))}
            </select>
            <button
              style={outlineButtonStyle('default', { padding: '2px 8px' })}
              onClick={onRefreshDevices}
              title="Обновить список"
            >
              ⟳
            </button>
            <button
              style={outlineButtonStyle(active ? 'active' : 'default', { padding: '2px 8px' })}
              onClick={onToggleActive}
            >
              {active ? '● монитор вкл' : '○ включить монитор'}
            </button>
          </>
        )}
        {active && <LevelMeterBar level={level} />}
        {error && (
          <Text fontSize="9px" color="red.400">
            ✗ {error}
          </Text>
        )}
      </Box>

      {active && (
        <Box display="flex" flexDir="column" gap={3}>
          <Section title="Компрессор">
            <KnobRow>
              <Knob
                value={dbToNorm(params.compressor.threshold, -60, 0)}
                onChange={(v) => setCompressor('threshold', normToDb(v, -60, 0))}
                label="порог"
                hint="Компрессор выравнивает громкость — тише этого порога голос не трогает, громче — придавливает, чтобы не было страшных скачков."
                displayValue={`${Math.round(params.compressor.threshold)}dB`}
              />
              <Knob
                value={dbToNorm(params.compressor.ratio, 1, 20)}
                onChange={(v) => setCompressor('ratio', normToDb(v, 1, 20))}
                label="сила"
                hint="Насколько жёстко придавливает то, что выше порога. Слабо (2:1) — мягко; сильно (10:1+) — почти лимитер."
                displayValue={`${params.compressor.ratio.toFixed(1)}:1`}
              />
            </KnobRow>
          </Section>

          <Section title="EQ">
            <KnobRow>
              <Knob
                value={dbToNorm(params.eq.lowGain, -15, 15)}
                onChange={(v) => setEq('lowGain', normToDb(v, -15, 15))}
                label="низ"
                hint="Тело голоса, грудной резонанс. Больше — теплее и весомее; меньше — суше и легче."
                displayValue={`${params.eq.lowGain > 0 ? '+' : ''}${Math.round(params.eq.lowGain)}dB`}
              />
              <Knob
                value={dbToNorm(params.eq.midGain, -15, 15)}
                onChange={(v) => setEq('midGain', normToDb(v, -15, 15))}
                label="середина"
                hint="Разборчивость слов. Больше — голос выступает вперёд; меньше — тонет в миксе."
                displayValue={`${params.eq.midGain > 0 ? '+' : ''}${Math.round(params.eq.midGain)}dB`}
              />
              <Knob
                value={dbToNorm(params.eq.highGain, -15, 15)}
                onChange={(v) => setEq('highGain', normToDb(v, -15, 15))}
                label="верх"
                hint="Воздух и чёткость согласных. Больше — ярче и «ближе к уху»; меньше — глуше, дальше."
                displayValue={`${params.eq.highGain > 0 ? '+' : ''}${Math.round(params.eq.highGain)}dB`}
              />
            </KnobRow>
          </Section>

          <Section title="Де-эссер">
            <Box display="flex" alignItems="center" gap={3}>
              <button
                style={outlineButtonStyle(params.deEsser.enabled ? 'active' : 'default', { padding: '2px 8px' })}
                onClick={() => setDeEsser('enabled', !params.deEsser.enabled)}
              >
                {params.deEsser.enabled ? '● вкл' : '○ выкл'}
              </button>
              <Knob
                value={dbToNorm(params.deEsser.threshold, -60, 0)}
                onChange={(v) => setDeEsser('threshold', normToDb(v, -60, 0))}
                label="чувствит."
                hint="Убирает свист/шипение «с» и «ш» — они не мягче, они резче любого другого звука. Ниже порог — чаще срабатывает."
                displayValue={`${Math.round(params.deEsser.threshold)}dB`}
              />
            </Box>
          </Section>

          <Section title="Отправки и монитор">
            <KnobRow>
              <Knob
                value={params.reverbSend}
                onChange={(v) => onParamsChange({ ...params, reverbSend: v })}
                label="реверб"
                hint={HINTS['fx.reverb.wet']}
              />
              <Knob
                value={params.delaySend}
                onChange={(v) => onParamsChange({ ...params, delaySend: v })}
                label="эхо"
                hint="Повторы твоего голоса, затихающие вслед — как крик в ущелье."
              />
              <Knob
                value={params.monitorGain / 1.5}
                onChange={(v) => onParamsChange({ ...params, monitorGain: v * 1.5 })}
                label="монитор"
                hint="Громкость голоса в наушниках/колонках прямо сейчас — не влияет на запись."
              />
            </KnobRow>
          </Section>

          <Box display="flex" alignItems="center" gap={2}>
            <button
              style={outlineButtonStyle(isRecording ? 'recording' : 'default', { padding: '2px 8px' })}
              onClick={onToggleRecording}
            >
              {isRecording ? '● стоп' : '● записать голос + бит'}
            </button>
            {recordingUrl && !isRecording && (
              <a
                href={recordingUrl}
                download={`synth-voice-${Date.now()}.webm`}
                style={{ fontSize: '9px', color: '#7fd88f', letterSpacing: '0.04em' }}
              >
                ↓ скачать дубль
              </a>
            )}
          </Box>
        </Box>
      )}
    </Box>
  )
}
