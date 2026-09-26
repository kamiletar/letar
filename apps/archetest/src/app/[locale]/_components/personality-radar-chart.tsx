'use client'

import { useShowClinicalNames } from '@/app/_hooks/use-psychologist'
import { Box, Collapsible, Heading, HStack, Text, useToken, VStack } from '@chakra-ui/react'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'
import { LuChevronDown } from 'react-icons/lu'
import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { groupLegendPoints } from '../_lib/radar-legend'

/** Порог ширины для мобильной адаптации */
const MOBILE_BREAKPOINT = 640
/** С какого балла шкала считается выраженной (как `whenHigh` в карточках черт) */
const HIGH_SCORE = 40

interface ChartDataPoint {
  /** Код шкалы (PAR, SZD, …) — подпись оси */
  type: string
  /** Мягкое название + архетип: «Бдительный Страж» */
  label: string
  /** Клиническое название (показывается только админу/психологу) */
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

/** Точка данных recharts: код на оси, полные названия — для тултипа и расшифровки */
interface RadarPoint {
  code: string
  name: string
  clinical?: string
  value: number
  comparison?: number
  lowConfidence: boolean
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
 * Подпись оси — только код шкалы. Полное название — в `<title>` (нативная подсказка при
 * наведении) и в тултипе recharts. Длинные «Бдительный Страж (Параноидный)» на 22 осях
 * наезжали друг на друга и вылезали за экран телефона (аудит 2026-09-24).
 *
 * Выраженные шкалы (≥ 40%) — жирным, шкалы с малым числом ответов — приглушённым цветом.
 */
function AxisTick({
  x = 0,
  y = 0,
  payload,
  cx = 0,
  cy = 0,
  points,
  isMobile,
}: {
  x?: number
  y?: number
  payload?: { value: string }
  cx?: number
  cy?: number
  points: Map<string, RadarPoint>
  isMobile: boolean
}) {
  const code = payload?.value ?? ''
  const point = points.get(code)

  // Смещаем подпись наружу вдоль оси, чтобы она не лежала на сетке
  const dx = x - cx
  const dy = y - cy
  const dist = Math.hypot(dx, dy) || 1
  const offset = isMobile ? 10 : 14
  const tx = x + (dx / dist) * offset
  const ty = y + (dy / dist) * offset

  let textAnchor: 'start' | 'middle' | 'end' = 'middle'
  if (dx > 8) {
    textAnchor = 'start'
  } else if (dx < -8) {
    textAnchor = 'end'
  }

  const isHigh = (point?.value ?? 0) >= HIGH_SCORE
  // Один строковый child у <title>: массив детей рвёт гидратацию
  // (см. .claude/docs/react19-svg-title-array-children-hydration.md)
  const hint = point
    ? `${code} — ${point.name}${point.clinical ? ` (${point.clinical})` : ''}: ${Math.round(point.value)}%`
    : code

  return (
    <text
      x={tx}
      y={ty}
      textAnchor={textAnchor}
      dominantBaseline="central"
      // style, а не SVG-атрибуты: атрибуты fill/font-weight перебиваются любым CSS-правилом
      // (замер: font-weight="700" давал вычисленные 400), а CSS-переменные темы гарантированно
      // работают только в CSS
      style={{
        fill: point?.lowConfidence ? 'var(--chakra-colors-fg-subtle)' : 'var(--chakra-colors-fg)',
        opacity: point?.lowConfidence ? 0.75 : 1,
        fontSize: isMobile ? 12 : 13,
        fontWeight: isHigh ? 700 : 500,
        letterSpacing: '0.02em',
        cursor: 'default',
      }}
    >
      <title>{hint}</title>
      {code}
    </text>
  )
}

/** Тултип: код + полное название шкалы и значения слоёв, в цветах темы */
function RadarTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ name?: unknown; value?: unknown; color?: string; payload?: RadarPoint }>
}) {
  const t = useTranslations('radar')
  const point = payload?.[0]?.payload
  if (!active || !point) {
    return null
  }

  return (
    <Box
      bg="bg.panel"
      color="fg"
      borderWidth="1px"
      borderColor="border"
      borderRadius="lg"
      boxShadow="lg"
      px={3}
      py={2}
      maxW="260px"
      fontSize="sm"
    >
      <HStack gap={2} align="baseline" mb={1}>
        <Text fontFamily="mono" fontWeight="bold" fontSize="xs" color="fg.muted">
          {point.code}
        </Text>
        <Text fontWeight="semibold" lineHeight="short">
          {point.name}
        </Text>
      </HStack>
      {point.clinical && (
        <Text fontSize="xs" color="fg.muted" mb={1}>
          {point.clinical}
        </Text>
      )}
      {payload?.map((entry) => (
        <HStack key={String(entry.name)} gap={2} fontSize="xs">
          <Box w={2.5} h={2.5} borderRadius="full" flexShrink={0} style={{ background: entry.color }} />
          <Text color="fg.muted" flex="1">
            {String(entry.name)}
          </Text>
          <Text fontWeight="semibold">{Math.round(Number(entry.value) || 0)}%</Text>
        </HStack>
      ))}
      {point.lowConfidence && (
        <Text fontSize="xs" color="fg.subtle" mt={1}>
          {t('lowConfidence')}
        </Text>
      )}
    </Box>
  )
}

/** Строка расшифровки: код → название → балл (и средний балл слоя сравнения) */
function LegendRow({ point: p, hasComparison }: { point: RadarPoint; hasComparison: boolean }) {
  return (
    <HStack gap={2} fontSize="sm" py={0.5} opacity={p.lowConfidence ? 0.7 : 1} minW={0} breakInside="avoid">
      <Text fontFamily="mono" fontWeight="bold" fontSize="xs" w="2.5rem" flexShrink={0}>
        {p.code}
      </Text>
      <Text flex="1" minW={0} truncate title={p.clinical ? `${p.name} (${p.clinical})` : p.name}>
        {p.name}
        {p.clinical && (
          <Box asChild color="fg.muted">
            <span>{` (${p.clinical})`}</span>
          </Box>
        )}
      </Text>
      <Text fontWeight={p.value >= HIGH_SCORE ? 'bold' : 'normal'} flexShrink={0}>
        {Math.round(p.value)}%
      </Text>
      {hasComparison && (
        <Text color="fg.muted" fontSize="xs" flexShrink={0} w="2.75rem" textAlign="end">
          ⌀ {Math.round(p.comparison ?? 0)}
        </Text>
      )}
    </HStack>
  )
}

/** Группа расшифровки с подзаголовком; `columns` — две колонки на экране от `sm` */
function LegendGroup({
  title,
  points,
  hasComparison,
  columns = false,
}: {
  title: string
  points: RadarPoint[]
  hasComparison: boolean
  columns?: boolean
}) {
  return (
    <Box>
      <Text
        fontSize="xs"
        fontWeight="semibold"
        color="fg.muted"
        textTransform="uppercase"
        letterSpacing="0.06em"
        mb={1}
      >
        {title}
      </Text>
      {
        /* Многоколоночная раскладка, а не сетка: сетка шла бы по строкам (1-й слева, 2-й справа),
          а ранжированный список читается столбцом */
      }
      <Box columnCount={columns ? { base: 1, sm: 2 } : 1} columnGap={6}>
        {points.map((p) => <LegendRow key={p.code} point={p} hasComparison={hasComparison} />)}
      </Box>
    </Box>
  )
}

/**
 * Расшифровка кодов под диаграммой (свёрнута по умолчанию). На телефоне тултип по тапу
 * неточен — список «код → название → балл» даёт тот же ответ без прицеливания в ось.
 * Шкалы отсортированы по баллу; «Состояния» (BAR/DPR) и черты с малым числом ответов
 * вынесены отдельными списками — приблизительные оценки не стоят в одном ряду с надёжными.
 */
function RadarLegend({
  points,
  hasComparison,
}: {
  points: RadarPoint[]
  hasComparison: boolean
}) {
  const t = useTranslations('radar')
  const { traits, uncertain, states } = useMemo(() => groupLegendPoints(points), [points])

  return (
    <Collapsible.Root mt={3}>
      <Collapsible.Trigger asChild>
        <HStack
          asChild
          mx="auto"
          gap={1.5}
          px={3}
          py={1.5}
          borderRadius="md"
          fontSize="sm"
          color="fg.muted"
          cursor="pointer"
          _hover={{ color: 'fg', bg: 'bg.muted' }}
          css={{ '&[data-state=open] svg': { transform: 'rotate(180deg)' } }}
        >
          <button type="button">
            {t('abbreviations')}
            <LuChevronDown />
          </button>
        </HStack>
      </Collapsible.Trigger>
      <Collapsible.Content>
        <VStack align="stretch" gap={4} mt={2} px={1} textAlign="start">
          {/* Черты: по убыванию, две колонки заполняются сверху вниз — самые выраженные вверху слева */}
          {traits.length > 0 && (
            <LegendGroup title={t('traits')} points={traits} hasComparison={hasComparison} columns />
          )}
          {/* Шкалы с малым числом ответов — отдельно: их баллы приблизительные и в общем ряду вводили бы в заблуждение */}
          {uncertain.length > 0 && (
            <LegendGroup title={t('lowConfidence')} points={uncertain} hasComparison={hasComparison} columns />
          )}
          {states.length > 0 && <LegendGroup title={t('states')} points={states} hasComparison={hasComparison} />}
        </VStack>
      </Collapsible.Content>
    </Collapsible.Root>
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
  const t = useTranslations('radar')

  // Резолвим токены для SVG-обводок/заливок
  const [resolvedColor, resolvedComparisonColor, resolvedBorder] = useToken('colors', [
    color,
    comparisonColor,
    'border',
  ])

  // useMemo обязателен: recharts перезапускает анимацию построения на каждый новый массив
  // данных, и без мемоизации раскрытие расшифровки схлопывало диаграмму в точку и
  // заново «выращивало» её
  const points = useMemo<RadarPoint[]>(
    () =>
      data.map((d, i) => {
        const conf = confidence?.[d.type]
        return {
          code: d.type,
          name: d.label,
          clinical: showClinical ? d.clinicalLabel : undefined,
          value: d.value,
          ...(comparisonData ? { comparison: comparisonData[i]?.value ?? 0 } : {}),
          lowConfidence: conf === 'insufficient' || conf === 'low',
        }
      }),
    [data, comparisonData, confidence, showClinical],
  )
  const pointsByCode = useMemo(() => new Map(points.map((p) => [p.code, p])), [points])
  const hasLowConfidence = points.some((p) => p.lowConfidence)

  // Короткие подписи-коды освобождают место: радиус больше, чем при полных названиях
  const outerRadius = isMobile ? '72%' : '76%'

  return (
    <Box w="100%">
      <Heading size="md" mb={2} textAlign="center">
        {title}
      </Heading>
      <Box w="100%" aspectRatio="1 / 1" maxH="560px" mx="auto" maxW="560px">
        <ResponsiveContainer width="100%" height="100%">
          {
            /* accessibilityLayer: фокус Tab на диаграмме, стрелки переключают оси и открывают тултип.
              В recharts 3 это умолчание, флаг стоит явно — чтобы смена умолчания не прошла тихо */
          }
          <RadarChart data={points} cx="50%" cy="50%" outerRadius={outerRadius} accessibilityLayer>
            <PolarGrid stroke={resolvedBorder} />
            <PolarAngleAxis
              dataKey="code"
              tick={(props: Record<string, unknown>) => (
                <AxisTick {...props} points={pointsByCode} isMobile={isMobile} />
              )}
            />
            <Tooltip
              content={({ active, payload }) => (
                <RadarTooltip
                  active={active}
                  payload={payload as ReadonlyArray<
                    { name?: unknown; value?: unknown; color?: string; payload?: RadarPoint }
                  >}
                />
              )}
              cursor={{ stroke: resolvedBorder }}
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
              dot={{ r: 2.5, fillOpacity: 1 }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </Box>
      {/* Легенда: слои и пометка достоверности */}
      <HStack justify="center" mt={1} gap={4} flexWrap="wrap" fontSize="xs" color="fg.muted">
        {comparisonData && (
          <>
            <HStack gap={1.5}>
              <Box w={3} h={0.5} style={{ background: resolvedColor }} />
              <Text>{title}</Text>
            </HStack>
            <HStack gap={1.5}>
              <Box w={3} borderTopWidth="2px" borderStyle="dashed" style={{ borderColor: resolvedComparisonColor }} />
              <Text>{comparisonTitle}</Text>
            </HStack>
          </>
        )}
        <Text color="fg.subtle" textAlign="center">
          {t('legendBold')}
          {hasLowConfidence && t('legendFaded')}
        </Text>
      </HStack>
      <RadarLegend points={points} hasComparison={!!comparisonData} />
    </Box>
  )
}
