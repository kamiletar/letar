'use client'

import type { FmEngineParams } from '@/lib/patch/schema'
import { Box, Grid, Text } from '@chakra-ui/react'
import { Knob } from './knob'

// Описания 5 реализованных алгоритмов
const ALG_LABELS: Record<number, string> = {
  1: '5→4→3→2→1→0',
  2: '[5→4→3]+[2→1→0]',
  3: '[5→4→3→0]+1+2',
  4: '[5→0][4→1][3→2]',
  5: '0+1+2+3+4+5',
}

function algBtnStyle(active: boolean): React.CSSProperties {
  return {
    padding: '2px 7px',
    fontSize: '10px',
    borderRadius: '4px',
    border: `1px solid ${active ? '#D4AF37' : '#2A2018'}`,
    background: active ? '#3A2E08' : '#160E0A',
    color: active ? '#EEC835' : '#706860',
    cursor: 'pointer',
    letterSpacing: '0.04em',
    lineHeight: 1.4,
    whiteSpace: 'nowrap' as const,
  }
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

interface OpCardProps {
  index: number
  op: FmEngineParams['operators'][number]
  onChange: (op: FmEngineParams['operators'][number]) => void
  isCarrier: boolean
}

function OpCard({ index, op, onChange, isCarrier }: OpCardProps) {
  const set = (k: keyof typeof op, v: unknown) => onChange({ ...op, [k]: v })
  const setEgRate = (i: 0 | 1 | 2 | 3, v: number) => {
    const rates = [...op.eg.rates] as [number, number, number, number]
    rates[i] = v
    onChange({ ...op, eg: { ...op.eg, rates } })
  }
  const setEgLevel = (i: 0 | 1 | 2 | 3, v: number) => {
    const levels = [...op.eg.levels] as [number, number, number, number]
    levels[i] = v
    onChange({ ...op, eg: { ...op.eg, levels } })
  }

  return (
    <Box
      bg={isCarrier ? '#1A1200' : '#0E0A00'}
      border="1px solid"
      borderColor={isCarrier ? 'border.emphasized' : 'border.subtle'}
      borderRadius="sm"
      p={2}
    >
      {/* Заголовок: номер + тип оператора */}
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Text fontSize="8px" fontWeight="700" color={isCarrier ? 'fg.gold' : 'fg.muted'} letterSpacing="0.1em">
          OP{index + 1}
        </Text>
        {isCarrier && (
          <Text fontSize="7px" color="fg.gold" opacity={0.7}>
            ♦
          </Text>
        )}
        {op.feedback > 0 && (
          <Text fontSize="7px" color="fg.muted" letterSpacing="0.06em">
            fb{op.feedback}
          </Text>
        )}
      </Box>

      {/* Основные ручки: ratio + level */}
      <Box display="flex" gap={2} mb={1}>
        <Knob
          label="ratio"
          value={Math.log2(op.ratio / 0.5) / Math.log2(28 / 0.5)}
          onChange={(v) => {
            // 0→0.5, 0.5→4, 1→28 — логарифмическая шкала для ratio
            const ratio = Math.round(0.5 * Math.pow(56, v) * 10) / 10
            set('ratio', ratio)
          }}
          displayValue={`×${op.ratio.toFixed(op.ratio < 10 ? 1 : 0)}`}
          hint="Отношение частоты оператора к ноте. 1=унисон, 2=октава, 14=металл."
          size={38}
        />
        <Knob
          label="level"
          value={op.level / 99}
          onChange={(v) => set('level', Math.round(v * 99))}
          displayValue={`${op.level}`}
          hint="Уровень оператора: громкость несущего или глубина модуляции."
          size={38}
        />
        {/* Feedback только у операторов с feedback > 0 или op0 */}
        {index === 0 && (
          <Knob
            label="fb"
            value={op.feedback / 7}
            onChange={(v) => set('feedback', Math.round(v * 7))}
            displayValue={`${op.feedback}`}
            hint="Feedback (самомодуляция). Добавляет нечётные гармоники — от тепла до шума."
            size={38}
          />
        )}
      </Box>

      {/* EG: Attack/Decay (rates) + Sustain (level[2]) + Release (rate[3]) */}
      <Text fontSize="7px" color="fg.subtle" letterSpacing="0.08em" mb={1}>
        EG
      </Text>
      <Box display="flex" gap={1} flexWrap="wrap">
        <Knob
          label="A"
          value={op.eg.rates[0] / 99}
          onChange={(v) => setEgRate(0, Math.round(v * 99))}
          displayValue={`${op.eg.rates[0]}`}
          hint="Attack rate: скорость нарастания. 99=мгновенно, 0=медленно."
          size={32}
        />
        <Knob
          label="D"
          value={op.eg.rates[1] / 99}
          onChange={(v) => setEgRate(1, Math.round(v * 99))}
          displayValue={`${op.eg.rates[1]}`}
          hint="Decay rate: скорость спада до уровня сустейна."
          size={32}
        />
        <Knob
          label="S"
          value={op.eg.levels[2] / 99}
          onChange={(v) => setEgLevel(2, Math.round(v * 99))}
          displayValue={`${op.eg.levels[2]}`}
          hint="Sustain level: уровень пока удерживаешь клавишу (0=нет сустейна)."
          size={32}
        />
        <Knob
          label="R"
          value={op.eg.rates[3] / 99}
          onChange={(v) => setEgRate(3, Math.round(v * 99))}
          displayValue={`${op.eg.rates[3]}`}
          hint="Release rate: скорость затухания после отпускания клавиши."
          size={32}
        />
      </Box>
    </Box>
  )
}

// Какие операторы являются несущими для каждого алгоритма (1-5)
const CARRIER_MAP: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 1, 2],
  4: [0, 1, 2],
  5: [0, 1, 2, 3, 4, 5],
}

interface FmPanelProps {
  engine: FmEngineParams
  onChange: (e: FmEngineParams) => void
}

export function FmPanel({ engine, onChange }: FmPanelProps) {
  const carriers = CARRIER_MAP[Math.min(5, engine.algorithm)] ?? [0]

  const setOp = (i: number, op: FmEngineParams['operators'][number]) => {
    const ops = [...engine.operators] as FmEngineParams['operators']
    ops[i] = op
    onChange({ ...engine, operators: ops })
  }

  return (
    <Box display="flex" flexDir="column" gap={3}>
      {/* Алгоритм + описание */}
      <Section title="FM — алгоритм">
        <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
          {[1, 2, 3, 4, 5].map((alg) => (
            <button
              key={alg}
              style={algBtnStyle(engine.algorithm === alg)}
              onClick={() => onChange({ ...engine, algorithm: alg })}
            >
              {alg}
            </button>
          ))}
        </Box>
        <Text fontSize="8px" color="fg.muted" letterSpacing="0.06em" fontFamily="mono">
          {ALG_LABELS[Math.min(5, engine.algorithm)] ?? '—'}
        </Text>
        <Text fontSize="8px" color="fg.subtle" mt={1}>
          ♦ несущие · → поток модуляции · op1=OP1 (снизу вверх)
        </Text>
      </Section>

      {/* 6 операторов в сетке */}
      <Grid templateColumns={{ base: '1fr 1fr', md: 'repeat(3, 1fr)' }} gap={2}>
        {engine.operators.map((op, i) => (
          <OpCard
            key={i}
            index={i}
            op={op}
            onChange={(o) => setOp(i, o)}
            isCarrier={carriers.includes(i)}
          />
        ))}
      </Grid>
    </Box>
  )
}
