'use client'

import { Badge, Box, Heading, HStack, SimpleGrid, Text, useToken, VStack } from '@chakra-ui/react'
import { useLocale } from 'next-intl'
import { type RefObject, useEffect, useRef, useState } from 'react'

import { prefersReducedMotion } from '@letar/hooks'

import {
  DARK_TRIAD_CODES,
  getPersonalityType,
  getScaleDisplayCode,
  getScaleName,
  HEXAGRAM_SCALE_CODES,
  LIGHT_TRIAD_CODES,
  type PersonalityTypeCode,
} from '../_data/personality-types'
import { computeHexagramGeometry, DEFAULT_SIZE, type HexagramVertex, type Point } from '../_lib/hexagram-geometry'

/** Длительность анимации построения звезды, мс */
const ANIMATION_MS = 700
/**
 * Поля вокруг геометрии под подписи вершин (viewBox шире квадрата геометрии).
 * Подписи — короткие коды, поэтому поля узкие: чем меньше viewBox, тем крупнее текст
 * на экране. С полными названиями (PAD_X 115) на телефоне подписи ужимались до ~7px.
 */
const PAD_X = 50
const PAD_Y = 16
/** Ширина viewBox — от неё считается масштаб SVG на экране */
const VIEWBOX_WIDTH = DEFAULT_SIZE + PAD_X * 2
/** Целевой экранный размер подписи вершины, px — одинаковый на телефоне и десктопе */
const LABEL_SCREEN_PX = 13
/** Границы размера подписи в единицах viewBox: снизу — читаемость, сверху — влезть в поля */
const LABEL_FONT_MIN = 16
const LABEL_FONT_MAX = 22

/**
 * Размер подписи в единицах viewBox, дающий ~13px на экране. SVG масштабируется целиком,
 * и фиксированный размер в единицах viewBox на телефоне (SVG ≈ 300px) ужимался вдвое.
 * До замера (SSR, первый кадр) — значение для десктопной ширины.
 */
function useLabelFontSize(svgRef: RefObject<SVGSVGElement | null>): number {
  const [fontSize, setFontSize] = useState(LABEL_FONT_MIN)

  useEffect(() => {
    const svg = svgRef.current
    if (!svg || typeof ResizeObserver === 'undefined') {
      return
    }
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0
      if (width > 0) {
        const units = LABEL_SCREEN_PX / (width / VIEWBOX_WIDTH)
        setFontSize(Math.min(LABEL_FONT_MAX, Math.max(LABEL_FONT_MIN, Math.round(units))))
      }
    })
    observer.observe(svg)
    return () => observer.disconnect()
  }, [svgRef])

  return fontSize
}

interface HexagramChartProps {
  /** Нормализованные баллы 0–100 (достаточно 8 шкал гексаграммы) */
  scores: Partial<Record<PersonalityTypeCode, number>>
  /** Заголовок над чартом */
  title?: string
  /** Показывать строку «зона интеграции» с оговоркой-метафорой */
  showIntegrationIndex?: boolean
  /** Микрокопия о символе (Гексаграмма/Шаткона) и независимости триад */
  showNarrative?: boolean
}

/**
 * Плавная анимация баллов: звезда строится от нуля при монтировании
 * и перетекает при обновлении (экспресс-тест обновляет по мере ответов).
 * При prefers-reduced-motion значения применяются мгновенно.
 */
function useAnimatedScores(
  target: Partial<Record<PersonalityTypeCode, number>>,
): Partial<Record<PersonalityTypeCode, number>> {
  const [animated, setAnimated] = useState<Partial<Record<PersonalityTypeCode, number>>>({})
  const currentRef = useRef<Partial<Record<PersonalityTypeCode, number>>>({})
  const targetKey = HEXAGRAM_SCALE_CODES.map((c) => target[c] ?? 0).join(',')

  useEffect(() => {
    if (prefersReducedMotion()) {
      currentRef.current = { ...target }
      // Синхронизация с внешней системой (requestAnimationFrame ниже), не
      // производное от пропсов значение
      // oxlint-disable-next-line react/set-state-in-effect
      setAnimated({ ...target })
      return
    }

    const from = { ...currentRef.current }
    const start = performance.now()
    let raf = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / ANIMATION_MS)
      const ease = 1 - (1 - t) ** 3 // ease-out cubic
      const next: Partial<Record<PersonalityTypeCode, number>> = {}
      for (const code of HEXAGRAM_SCALE_CODES) {
        const a = from[code] ?? 0
        const b = target[code] ?? 0
        next[code] = a + (b - a) * ease
      }
      currentRef.current = next
      setAnimated(next)
      if (t < 1) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // Зависимость — сериализованные значения шкал: сам объект target пересоздаётся на каждый рендер
  }, [targetKey])

  return animated
}

/**
 * Подпись шкалы: гексаграмма — единственное пользовательское место, где показываются
 * конструктные названия («Гуманизм», «Психопатия»): без терминов триад визуализация
 * теряет смысл. Аудитория `construct` разрешает это только для шкал белого списка
 * (см. PUBLIC_CONSTRUCT_SCALES) — все восемь вершин в него входят.
 */
function scaleLabel(code: PersonalityTypeCode, isRu: boolean): string {
  return getScaleName(code, { audience: 'construct', triadAlias: true }, isRu)
}

/** Подпись вершины за пределами ауры: код шкалы + балл, полное название — в подсказке */
function VertexLabel({
  vertex,
  center,
  labelRadius,
  fill,
  fontSize,
  isRu,
}: {
  vertex: HexagramVertex
  center: Point
  labelRadius: number
  fill: string
  fontSize: number
  isRu: boolean
}) {
  const dx = vertex.point.x - center.x
  const dy = vertex.point.y - center.y
  const dist = Math.hypot(dx, dy) || 1
  // Позиция подписи — вдоль оси вершины на фиксированном радиусе
  const x = center.x + (dx / dist) * labelRadius
  const y = center.y + (dy / dist) * labelRadius

  let textAnchor: 'start' | 'middle' | 'end' = 'middle'
  if (dx > 20) {
    textAnchor = 'start'
  } else if (dx < -20) {
    textAnchor = 'end'
  }

  const code = getScaleDisplayCode(vertex.code, { triadAlias: true })
  const percent = Math.round(vertex.value)
  // Один строковый child у <title>: массив детей рвёт гидратацию
  // (см. .claude/docs/react19-svg-title-array-children-hydration.md)
  const hint = `${code} — ${scaleLabel(vertex.code, isRu)}: ${percent}%`

  return (
    <text
      x={x}
      y={y}
      textAnchor={textAnchor}
      dominantBaseline="central"
      // Начертание и размер — в style: SVG-атрибуты font-* перебиваются любым CSS-правилом
      style={{ fill, fontSize, fontWeight: 700 }}
    >
      <title>{hint}</title>
      {code}
      <tspan opacity={0.7} style={{ fontWeight: 400 }}>{` ${percent}%`}</tspan>
    </text>
  )
}

/** Строка легенды: цветная метка группы, код, полное название, балл */
function LegendRow({ code, name, value, swatch }: { code: string; name: string; value: number; swatch: string }) {
  return (
    <HStack gap={2} fontSize="sm" minW={0}>
      <Box w={2.5} h={2.5} borderRadius="full" flexShrink={0} style={{ background: swatch }} />
      <Text fontFamily="mono" fontWeight="bold" fontSize="xs" w="2.25rem" flexShrink={0}>
        {code}
      </Text>
      <Text flex="1" minW={0} truncate>
        {name}
      </Text>
      <Text fontWeight="semibold" flexShrink={0}>
        {Math.round(value)}%
      </Text>
    </HStack>
  )
}

/**
 * Гексаграмма (Шаткона) — наложение Светлой и Тёмной триад (этап 5.2).
 *
 * Треугольник Света вершиной вверх (HUM/KAN/FAI), Тени — вниз (PSY/NAR/MAC),
 * заливка пересечения — визуальная «зона интеграции» (метафора), внешние
 * кольца-ауры — SAD и MAS (насыщенность по баллу), точка S-вектора — центр
 * тяжести профиля с меткой «Конструктивный Архитектор» при высоких MAC+KAN.
 */
export function HexagramChart({
  scores,
  title,
  showIntegrationIndex = true,
  showNarrative = false,
}: HexagramChartProps) {
  const locale = useLocale()
  const isRu = locale === 'ru'

  const animatedScores = useAnimatedScores(scores)
  const svgRef = useRef<SVGSVGElement>(null)
  const labelFontSize = useLabelFontSize(svgRef)
  const geometry = computeHexagramGeometry(animatedScores, DEFAULT_SIZE)
  const { center, maxRadius } = geometry

  const [lightColor, darkColor, integrationColor, sadColor, masColor, gridColor, fgColor] = useToken('colors', [
    'yellow.400',
    'purple.500',
    'teal.400',
    'red.500',
    'blue.400',
    'border',
    'fg',
  ])

  const toPoints = (vertices: HexagramVertex[]) => vertices.map((v) => `${v.point.x},${v.point.y}`).join(' ')
  const intersectionPoints = geometry.intersectionPolygon.map((p) => `${p.x},${p.y}`).join(' ')

  // Радиусы колец ауры и подписей — за пределами вершин
  const sadRingRadius = maxRadius * 1.06
  const masRingRadius = maxRadius * 1.12
  const labelRadius = maxRadius * 1.2

  const integrationPercent = Math.round(geometry.integrationIndex * 100)
  const masBeta = getPersonalityType('MAS').beta

  return (
    <Box w="100%">
      {title && (
        <Heading size="md" mb={4} textAlign="center">
          {title}
        </Heading>
      )}

      <Box w="100%" maxW="460px" mx="auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEWBOX_WIDTH} ${DEFAULT_SIZE + PAD_Y * 2}`}
          width="100%"
          role="img"
          aria-label={isRu ? 'Гексаграмма Светлой и Тёмной триад' : 'Hexagram of the Light and Dark triads'}
        >
          <g transform={`translate(${PAD_X}, ${PAD_Y})`}>
            {/* Сетка: концентрические окружности 25/50/75/100% */}
            {[0.25, 0.5, 0.75, 1].map((r) => (
              <circle
                key={r}
                cx={center.x}
                cy={center.y}
                r={maxRadius * r}
                fill="none"
                stroke={gridColor}
                strokeWidth={1}
                strokeDasharray={r === 1 ? undefined : '3 5'}
              />
            ))}

            {/* Аура SAD (внешнее кольцо): толщина и насыщенность растут с баллом */}
            {geometry.aura.sad > 0.01 && (
              <circle
                cx={center.x}
                cy={center.y}
                r={sadRingRadius}
                fill="none"
                stroke={sadColor}
                strokeWidth={1.5 + geometry.aura.sad * 5}
                opacity={0.08 + geometry.aura.sad * 0.92}
              />
            )}
            {/* Аура MAS (второе кольцо, авторский бета-конструкт) */}
            {geometry.aura.mas > 0.01 && (
              <circle
                cx={center.x}
                cy={center.y}
                r={masRingRadius}
                fill="none"
                stroke={masColor}
                strokeWidth={1.5 + geometry.aura.mas * 5}
                strokeDasharray="10 6"
                opacity={0.08 + geometry.aura.mas * 0.92}
              />
            )}

            {/* Треугольник Света (вершина вверх) */}
            <polygon
              points={toPoints(geometry.light)}
              fill={lightColor}
              fillOpacity={0.25}
              stroke={lightColor}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            {/* Треугольник Тени (вершина вниз) */}
            <polygon
              points={toPoints(geometry.dark)}
              fill={darkColor}
              fillOpacity={0.25}
              stroke={darkColor}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            {/* Зона интеграции — пересечение треугольников */}
            {geometry.intersectionPolygon.length >= 3 && (
              <polygon points={intersectionPoints} fill={integrationColor} fillOpacity={0.35} stroke="none" />
            )}

            {/* Вершины */}
            {[...geometry.light, ...geometry.dark].map((v, i) => (
              <circle key={v.code} cx={v.point.x} cy={v.point.y} r={4} fill={i < 3 ? lightColor : darkColor} />
            ))}

            {/* S-вектор: центр тяжести профиля */}
            <circle cx={geometry.sVector.x} cy={geometry.sVector.y} r={5} fill={fgColor} />
            <circle
              cx={geometry.sVector.x}
              cy={geometry.sVector.y}
              r={9}
              fill="none"
              stroke={fgColor}
              strokeWidth={1.5}
              opacity={0.5}
            />

            {/* Подписи вершин */}
            {[...geometry.light, ...geometry.dark].map((v) => (
              <VertexLabel
                key={v.code}
                vertex={v}
                center={center}
                labelRadius={labelRadius}
                fill={fgColor}
                fontSize={labelFontSize}
                isRu={isRu}
              />
            ))}
          </g>
        </svg>
      </Box>

      <VStack gap={2} mt={3}>
        {/* Метка Конструктивного Архитектора (высокие MAC + KAN смещают S-вектор) */}
        {geometry.isConstructiveArchitect && (
          <Badge colorPalette="teal" variant="subtle" fontSize="sm">
            {isRu ? 'Конструктивный Архитектор' : 'Constructive Architect'}
          </Badge>
        )}

        {/* Индекс интеграции — с явной оговоркой про метафору */}
        {showIntegrationIndex && (
          <Text fontSize="sm" color="fg.muted" textAlign="center">
            {isRu
              ? `Зона интеграции: ${integrationPercent}% — визуальная метафора наложения триад, не психометрическая метрика`
              : `Integration zone: ${integrationPercent}% — a visual metaphor of triad overlap, not a psychometric metric`}
          </Text>
        )}

        {/* Расшифровка кодов: полные названия и баллы — на диаграмме только коды */}
        <SimpleGrid columns={{ base: 1, sm: 2 }} columnGap={8} rowGap={1} w="100%" maxW="520px" mt={1}>
          <VStack align="stretch" gap={1}>
            <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wide">
              {isRu ? 'Светлая триада' : 'Light triad'}
            </Text>
            {LIGHT_TRIAD_CODES.map((code) => (
              <LegendRow
                key={code}
                code={getScaleDisplayCode(code, { triadAlias: true })}
                name={scaleLabel(code, isRu)}
                value={scores[code] ?? 0}
                swatch={lightColor}
              />
            ))}
          </VStack>
          <VStack align="stretch" gap={1} mt={{ base: 2, sm: 0 }}>
            <Text fontSize="xs" fontWeight="semibold" color="fg.muted" textTransform="uppercase" letterSpacing="wide">
              {isRu ? 'Тёмная триада' : 'Dark triad'}
            </Text>
            {DARK_TRIAD_CODES.map((code) => (
              <LegendRow
                key={code}
                code={getScaleDisplayCode(code, { triadAlias: true })}
                name={scaleLabel(code, isRu)}
                value={scores[code] ?? 0}
                swatch={darkColor}
              />
            ))}
          </VStack>
        </SimpleGrid>

        {/* Легенда ауры */}
        {(geometry.aura.sad > 0.01 || geometry.aura.mas > 0.01) && (
          <HStack gap={4} flexWrap="wrap" justify="center">
            {geometry.aura.sad > 0.01 && (
              <HStack gap={1.5}>
                <Box w={3} h={3} borderRadius="full" borderWidth="2px" borderColor={sadColor} />
                <Text fontSize="xs" color="fg.muted">
                  {scaleLabel('SAD', isRu)} {Math.round(geometry.aura.sad * 100)}%
                </Text>
              </HStack>
            )}
            {geometry.aura.mas > 0.01 && (
              <HStack gap={1.5}>
                <Box w={3} h={3} borderRadius="full" borderWidth="2px" borderColor={masColor} borderStyle="dashed" />
                <Text fontSize="xs" color="fg.muted">
                  {scaleLabel('MAS', isRu)} {Math.round(geometry.aura.mas * 100)}%
                  {masBeta && (
                    <Badge ml={1} size="xs" colorPalette="orange" variant="subtle">
                      β
                    </Badge>
                  )}
                </Text>
              </HStack>
            )}
          </HStack>
        )}

        {/* Нарратив символа + независимость измерений (микрокопия этапа 5.2) */}
        {showNarrative && (
          <VStack gap={1} maxW="600px">
            <Text fontSize="xs" color="fg.muted" textAlign="center">
              {isRu
                ? 'Гексаграмма (Шаткона) — древний символ сакральной геометрии: два встречных треугольника как соединение противоположностей (огонь и вода, дух и материя). Здесь — наложение Светлой и Тёмной триад твоей личности.'
                : 'The hexagram (Shatkona) is an ancient symbol of sacred geometry: two interlocking triangles joining opposites (fire and water, spirit and matter). Here it overlays the Light and Dark triads of your personality.'}
            </Text>
            <Text fontSize="xs" color="fg.muted" textAlign="center">
              {isRu
                ? 'Светлая и Тёмная триады — независимые измерения, а не концы одной оси: высокие баллы по обеим — норма данных, не парадокс.'
                : 'The Light and Dark triads are independent dimensions, not two ends of one axis: high scores on both are normal in the data, not a paradox.'}
            </Text>
          </VStack>
        )}
      </VStack>
    </Box>
  )
}
