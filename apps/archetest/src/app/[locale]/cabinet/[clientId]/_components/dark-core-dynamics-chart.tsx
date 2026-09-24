'use client'

import { Box, Heading, Text, useToken } from '@chakra-ui/react'
import { useLocale, useTranslations } from 'next-intl'
import { useMemo } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { type DarkCoreSession, toDarkCoreChartPoints } from '../../../_lib/session-dynamics'

/**
 * Динамика индекса «Тёмное ядро» по сессиям (пул 2026-09-24, волна 7.1) — только кабинет.
 * Уровень ядра каждой порции с интервалом: интервалы соседних сессий перекрываются — значит,
 * «изменение» может быть шумом порции, а не сдвигом черты. Показывается с двух точек.
 */
export function DarkCoreDynamicsChart({ sessions }: { sessions: readonly DarkCoreSession[] }) {
  const locale = useLocale()
  const t = useTranslations('cabinet.darkCoreDynamics')
  const [line, band, grid] = useToken('colors', ['orange.500', 'orange.200', 'border'])
  const points = useMemo(() => toDarkCoreChartPoints(sessions, locale), [sessions, locale])

  if (points.length < 2) {
    return null
  }

  return (
    <Box w="100%">
      <Heading size="md" mb={1}>
        {t('title')}
      </Heading>
      <Text fontSize="xs" color="fg.muted" mb={3}>
        {t('hint')}
      </Text>
      <Box w="100%" h="220px">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={points} margin={{ top: 8, right: 24, bottom: 0, left: 0 }} accessibilityLayer>
            <CartesianGrid stroke={grid} strokeDasharray="3 3" />
            <XAxis dataKey="name" fontSize={10} />
            <YAxis domain={[0, 100]} fontSize={10} />
            <Tooltip
              formatter={(value, name) =>
                name === 'ci' && Array.isArray(value)
                  ? [`${value[0]}–${value[1]}%`, t('interval')]
                  : [`${value}%`, t('core')]}
            />
            <Area dataKey="ci" stroke="none" fill={band} fillOpacity={0.5} isAnimationActive={false} />
            <Line dataKey="core" stroke={line} strokeWidth={2} dot isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  )
}
