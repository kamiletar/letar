'use client'

import { useShowClinicalNames } from '@/app/_hooks/use-psychologist'
import { Box, Heading, HStack, Text, useToken } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'

/** Порог ширины для мобильной адаптации */
const MOBILE_BREAKPOINT = 640

interface ChartDataPoint {
  type: string
  /** Мягкое название + архетип: «Бдительный Страж» */
  label: string
  /** Клиническое название (показывается только админу) */
  clinicalLabel?: string
  value: number
  /** Цвет кластера для точки */
  clusterColor?: string
}

interface PersonalityRadarChartProps {
  data: ChartDataPoint[]
  title: string
  color: string
  /** Опциональные данные для второго слоя (усреднённый) */
  comparisonData?: ChartDataPoint[]
  comparisonColor?: string
  comparisonTitle?: string
  /** Достоверность шкал (для визуальных индикаторов) */
  confidence?: Record<string, string>
}

/** Хук для определения мобильного экрана */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

/**
 * Кастомный tick для осей радара — переносит длинные подписи на строки.
 * На мобилке уменьшает шрифт для 13 осей.
 * Шкалы с низкой достоверностью показываются серым.
 */
function CustomAxisTick({
  x = 0,
  y = 0,
  payload,
  cx = 0,
  cy = 0,
  lowConfidenceLabels,
  tickFill,
  tickFillLow,
  isMobile,
}: {
  x?: number
  y?: number
  payload?: { value: string }
  cx?: number
  cy?: number
  lowConfidenceLabels?: Set<string>
  tickFill?: string
  tickFillLow?: string
  isMobile?: boolean
}) {
  const text: string = payload?.value ?? ''
  const lines = text.includes('\n') ? text.split('\n') : [text]
  const isLowConfidence = lowConfidenceLabels?.has(text)

  const fontSize = isMobile ? 9 : 11
  const fontSizeSmall = isMobile ? 8 : 10
  const lineHeight = isMobile ? 12 : 14

  // Смещаем подписи от центра чарта
  const dx = x - cx
  const dy = y - cy
  const dist = Math.sqrt(dx * dx + dy * dy)
  const offsetDistance = isMobile ? 12 : 20
  const offsetFactor = offsetDistance / (dist || 1)
  const offsetX = dx * offsetFactor
  const offsetY = dy * offsetFactor

  // Выбираем textAnchor в зависимости от положения относительно центра
  let textAnchor: 'start' | 'middle' | 'end' = 'middle'
  if (dx > 30) {
    textAnchor = 'start'
  } else if (dx < -30) {
    textAnchor = 'end'
  }

  return (
    <text
      x={x + offsetX}
      y={y + offsetY}
      textAnchor={textAnchor}
      dominantBaseline="central"
      fill={isLowConfidence ? (tickFillLow ?? '#999') : (tickFill ?? '#333')}
      fontSize={fontSize}
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x + offsetX} dy={i === 0 ? 0 : lineHeight} fontSize={i > 0 ? fontSizeSmall : fontSize}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

export function PersonalityRadarChart({
  data,
  title,
  color,
  comparisonData,
  comparisonColor = 'gray.400',
  comparisonTitle,
  confidence,
}: PersonalityRadarChartProps) {
  const showClinical = useShowClinicalNames()
  const isMobile = useIsMobile()

  // Резолвим семантические токены в hex для SVG (CSS-переменные не работают в SVG fill)
  const [tickFill, tickFillLow, resolvedColor, resolvedComparisonColor, resolvedBorder] = useToken('colors', [
    'fg',
    'fg.muted',
    color,
    comparisonColor,
    'border',
  ])

  // Собираем метки с низкой достоверностью для визуального затемнения
  const lowConfidenceLabels = new Set<string>()
  if (confidence) {
    for (const d of data) {
      const conf = confidence[d.type]
      if (conf === 'insufficient' || conf === 'low') {
        const label = showClinical && d.clinicalLabel ? `${d.label}\n(${d.clinicalLabel})` : d.label
        lowConfidenceLabels.add(label)
      }
    }
  }

  // Объединяем данные для сравнения
  const chartData = data.map((d, i) => ({
    // Для админа/психолога — клиническое название на второй строке
    label: showClinical && d.clinicalLabel ? `${d.label}\n(${d.clinicalLabel})` : d.label,
    value: d.value,
    ...(comparisonData ? { comparison: comparisonData[i]?.value ?? 0 } : {}),
  }))

  const hasLowConfidence = lowConfidenceLabels.size > 0

  // На мобилке уменьшаем радиус чтобы подписи влезали
  const outerRadius = isMobile ? '58%' : '75%'

  return (
    <Box w="100%">
      <Heading size="md" mb={4} textAlign="center">
        {title}
      </Heading>
      <Box w="100%" aspectRatio="1 / 1" maxH="700px">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData} cx="50%" cy="50%" outerRadius={outerRadius}>
            <PolarGrid stroke={resolvedBorder} />
            <PolarAngleAxis
              dataKey="label"
              tick={(props: Record<string, unknown>) => (
                <CustomAxisTick
                  {...props}
                  lowConfidenceLabels={lowConfidenceLabels}
                  tickFill={tickFill}
                  tickFillLow={tickFillLow}
                  isMobile={isMobile}
                />
              )}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--chakra-colors-bg)',
                border: `1px solid ${resolvedBorder}`,
                borderRadius: '8px',
                fontSize: '13px',
                maxWidth: '280px',
                whiteSpace: 'normal' as const,
              }}
            />
            {comparisonData && (
              <Radar
                name={comparisonTitle ?? ''}
                dataKey="comparison"
                stroke={resolvedComparisonColor}
                fill={resolvedComparisonColor}
                fillOpacity={0.15}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            )}
            <Radar
              name={title}
              dataKey="value"
              stroke={resolvedColor}
              fill={resolvedColor}
              fillOpacity={0.35}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Box>
      {/* Легенда достоверности */}
      {hasLowConfidence && (
        <HStack justify="center" mt={2} gap={4}>
          <HStack gap={1}>
            <Box w={3} h={3} borderRadius="sm" bg="fg.subtle" opacity={0.5} />
            <Text fontSize="xs" color="fg.subtle">
              Мало данных
            </Text>
          </HStack>
        </HStack>
      )}
    </Box>
  )
}
