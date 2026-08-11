'use client'

/**
 * График рейтинга поэта по выступлениям (recharts).
 * Показывает totalScore по хронологии матчей + скользящее среднее.
 */

import { SectionHeading } from '@/app/_components/section-heading'
import { Box, Text, useToken } from '@chakra-ui/react'
import { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface ChartPerf {
  totalScore: number | null
  textAdjusted: number | null
  deliveryAdjusted: number | null
  match: {
    id: string
    scheduledAt: Date | string | null
    homeTeam: { team: { name: string } }
    awayTeam: { team: { name: string } }
  }
}

interface PlayerRatingChartProps {
  perfs: ChartPerf[]
}

/** Скользящее среднее (окно = 3) */
function movingAvg(values: number[], window = 3): (number | null)[] {
  return values.map((_, i) => {
    if (i < window - 1) {
      return null
    }
    const slice = values.slice(i - window + 1, i + 1)
    return Math.round((slice.reduce((s, v) => s + v, 0) / slice.length) * 10) / 10
  })
}

export function PlayerRatingChart({ perfs }: PlayerRatingChartProps) {
  const [brandColor] = useToken('colors', ['brand.solid'])

  const data = useMemo(() => {
    // Хронологический порядок (старые → новые)
    const sorted = [...perfs].reverse()
    const scores = sorted.map((p) => p.totalScore ?? 0)
    const ma = movingAvg(scores)

    return sorted.map((p, i) => {
      const date = p.match.scheduledAt
        ? new Date(p.match.scheduledAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })
        : '—'
      const teams = `${p.match.homeTeam.team.name} — ${p.match.awayTeam.team.name}`
      return {
        label: date,
        match: teams,
        score: p.totalScore ?? 0,
        text: p.textAdjusted ?? 0,
        delivery: p.deliveryAdjusted ?? 0,
        ma: ma[i],
      }
    })
  }, [perfs])

  if (perfs.length < 3) { return null }

  const avgScore = Math.round(data.reduce((s, d) => s + d.score, 0) / data.length)

  return (
    <Box>
      <SectionHeading mb={3}>Динамика баллов</SectionHeading>
      <Box bg="bg.panel" borderRadius="xl" borderWidth="1px" borderColor="border.muted" px={{ base: 2, md: 4 }} py={4}>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={brandColor || '#6366f1'} stopOpacity={0.3} />
                <stop offset="95%" stopColor={brandColor || '#6366f1'} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis dataKey="label" fontSize={11} tick={{ fill: 'var(--chakra-colors-fg-muted)' }} />
            <YAxis domain={[0, 30]} fontSize={11} tick={{ fill: 'var(--chakra-colors-fg-muted)' }} />
            <Tooltip content={<ChartTooltip />} />
            <ReferenceLine y={avgScore} stroke="gray" strokeDasharray="4 4" opacity={0.5} />
            <Area
              type="monotone"
              dataKey="score"
              stroke={brandColor || '#6366f1'}
              strokeWidth={2}
              fill="url(#scoreGradient)"
              dot={{ r: 4, fill: brandColor || '#6366f1' }}
              activeDot={{ r: 6 }}
            />
            {data.length >= 3 && (
              <Line
                type="monotone"
                dataKey="ma"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={false}
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
        <Text fontSize="xs" color="fg.muted" textAlign="center" mt={1}>
          Пунктир — скользящее среднее (3 матча)
        </Text>
      </Box>
    </Box>
  )
}

/** Кастомный tooltip для графика */
function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: Record<string, unknown> }>
}) {
  if (!active || !payload?.length) { return null }
  const d = payload[0].payload as { match: string; score: number; text: number; delivery: number; ma: number | null }
  return (
    <Box bg="bg.panel" borderWidth="1px" borderColor="border.muted" borderRadius="md" p={3} shadow="lg" fontSize="sm">
      <Text fontWeight="bold" mb={1}>
        {d.match}
      </Text>
      <Text>
        Итого: <strong>{d.score}</strong>
      </Text>
      <Text color="fg.muted">
        Текст: {d.text} / Подача: {d.delivery}
      </Text>
      {d.ma !== null && <Text color="fg.muted">Среднее (3): {d.ma}</Text>}
    </Box>
  )
}
