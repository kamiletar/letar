'use client'

import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useLocale } from 'next-intl'
import { useCallback, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { PersonalityTypeCode } from '../../../_data/personality-types'
import { PERSONALITY_TYPES } from '../../../_data/personality-types'

interface SessionData {
  id: string
  scores: Record<PersonalityTypeCode, number> | null
  answeredCount: number
  completedAt: Date | null
  createdAt: Date
}

interface SessionDynamicsChartProps {
  sessions: SessionData[]
}

/**
 * График динамики результатов по сессиям (LineChart)
 */
export function SessionDynamicsChart({ sessions }: SessionDynamicsChartProps) {
  const locale = useLocale()
  const isRu = locale === 'ru'
  const [hiddenScales, setHiddenScales] = useState<Set<string>>(new Set())

  const toggleScale = useCallback((code: string) => {
    setHiddenScales((prev) => {
      const next = new Set(prev)
      if (next.has(code)) {
        next.delete(code)
      } else {
        next.add(code)
      }
      return next
    })
  }, [])

  if (sessions.length === 0) {
    return null
  }

  // Готовим данные для графика
  const chartData = sessions
    .filter((s) => s.scores)
    .map((s, i) => {
      const date = s.completedAt ? new Date(s.completedAt) : new Date(s.createdAt)
      const entry: Record<string, string | number> = {
        name: `#${i + 1} (${date.toLocaleDateString(isRu ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'short' })})`,
      }
      for (const type of PERSONALITY_TYPES) {
        entry[type.code] = s.scores![type.code] ?? 0
      }
      return entry
    })

  if (chartData.length < 2) {
    return null
  }

  return (
    <VStack align="start" gap={3} w="100%">
      <Heading size="md">{isRu ? 'Динамика результатов' : 'Results Dynamics'}</Heading>

      {/* Toggle шкал */}
      <HStack flexWrap="wrap" gap={1}>
        {PERSONALITY_TYPES.map((type) => (
          <Box
            key={type.code}
            as="button"
            px={2}
            py={0.5}
            fontSize="xs"
            borderRadius="md"
            cursor="pointer"
            bg={hiddenScales.has(type.code) ? 'bg.subtle' : type.color}
            color={hiddenScales.has(type.code) ? 'fg.muted' : 'fg.inverted'}
            opacity={hiddenScales.has(type.code) ? 0.5 : 1}
            onClick={() => toggleScale(type.code)}
          >
            {type.code}
          </Box>
        ))}
      </HStack>

      <Box w="100%" h="300px">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" fontSize={10} />
            <YAxis domain={[0, 100]} fontSize={10} />
            <Tooltip
              contentStyle={{ fontSize: 12 }}
              formatter={(value: unknown, name: unknown) => {
                const type = PERSONALITY_TYPES.find((t) => t.code === String(name))
                const label = type
                  ? `${isRu ? type.label : type.labelEn} (${isRu ? type.clinical : type.clinicalEn})`
                  : String(name)
                return [`${value}%`, label]
              }}
            />
            {PERSONALITY_TYPES.filter((t) => !hiddenScales.has(t.code)).map((type) => (
              <Line
                key={type.code}
                type="monotone"
                dataKey={type.code}
                stroke={type.color}
                strokeWidth={2}
                dot={{ r: 3 }}
                name={type.code}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>

      <Text fontSize="xs" color="fg.muted">
        {isRu ? 'Кликните на код шкалы чтобы скрыть/показать линию' : 'Click a scale code to toggle its line'}
      </Text>
    </VStack>
  )
}
