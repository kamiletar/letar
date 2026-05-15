'use client'

import { Badge, Box, Text, VStack } from '@chakra-ui/react'
import { useState } from 'react'

/**
 * Зона тела
 */
export interface BodyZone {
  /**
   * ID зоны
   */
  id: string

  /**
   * Название зоны
   */
  name: string

  /**
   * Уровень напряжения (0-10)
   */
  tension: number

  /**
   * Описание зажима
   */
  description?: string

  /**
   * Координаты для отображения (x, y в процентах)
   */
  x: number
  y: number
}

export interface BodyMapProps {
  /**
   * Зоны тела с зажимами
   */
  zones: BodyZone[]

  /**
   * Показывать ли подписи зон
   */
  showLabels?: boolean

  /**
   * Ориентация (вид спереди или сзади)
   */
  view?: 'front' | 'back'
}

/**
 * Получить цвет зоны в зависимости от уровня напряжения
 */
function getTensionColor(tension: number): string {
  if (tension >= 8) {
    return '#E53E3E' // Красный - высокое напряжение
  }
  if (tension >= 5) {
    return '#ED8936' // Оранжевый - среднее напряжение
  }
  if (tension >= 3) {
    return '#ECC94B' // Желтый - легкое напряжение
  }
  return '#48BB78' // Зеленый - норма
}

/**
 * Получить размер точки в зависимости от уровня напряжения
 */
function getTensionSize(tension: number): number {
  return 8 + (tension / 10) * 12 // От 8 до 20
}

/**
 * Интерактивная карта тела для отображения зажимов и напряжений
 */
export function BodyMap({ zones, showLabels = true, view = 'front' }: BodyMapProps) {
  const [hoveredZone, setHoveredZone] = useState<string | null>(null)

  return (
    <Box position="relative" width="100%" maxWidth="400px" mx="auto">
      {/* SVG силуэт тела */}
      <Box position="relative" width="100%" paddingBottom="150%" bg="gray.50" borderRadius="lg">
        <svg
          viewBox="0 0 200 300"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
          }}
        >
          {/* Простой силуэт тела (вид спереди) */}
          {view === 'front' ? (
            <g>
              {/* Голова */}
              <ellipse cx="100" cy="30" rx="25" ry="30" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />

              {/* Шея */}
              <rect x="90" y="55" width="20" height="20" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />

              {/* Плечи */}
              <ellipse cx="100" cy="85" rx="50" ry="15" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />

              {/* Туловище */}
              <rect x="60" y="75" width="80" height="100" rx="10" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />

              {/* Руки */}
              <rect x="25" y="85" width="30" height="80" rx="15" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />
              <rect x="145" y="85" width="30" height="80" rx="15" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />

              {/* Таз */}
              <ellipse cx="100" cy="180" rx="40" ry="20" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />

              {/* Ноги */}
              <rect x="65" y="190" width="30" height="100" rx="15" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />
              <rect x="105" y="190" width="30" height="100" rx="15" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />
            </g>
          ) : (
            <g>
              {/* Вид сзади (упрощенный) */}
              <ellipse cx="100" cy="30" rx="25" ry="30" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />
              <rect x="90" y="55" width="20" height="20" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />
              <ellipse cx="100" cy="85" rx="50" ry="15" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />
              <rect x="60" y="75" width="80" height="100" rx="10" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />
              <rect x="25" y="85" width="30" height="80" rx="15" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />
              <rect x="145" y="85" width="30" height="80" rx="15" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />
              <ellipse cx="100" cy="180" rx="40" ry="20" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />
              <rect x="65" y="190" width="30" height="100" rx="15" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />
              <rect x="105" y="190" width="30" height="100" rx="15" fill="#E8E8E8" stroke="#CCC" strokeWidth="2" />
            </g>
          )}

          {/* Точки зажимов */}
          {zones.map((zone) => {
            const color = getTensionColor(zone.tension)
            const size = getTensionSize(zone.tension)
            const isHovered = hoveredZone === zone.id

            // Конвертация процентов в координаты viewBox
            const x = (zone.x / 100) * 200
            const y = (zone.y / 100) * 300

            return (
              <g key={zone.id}>
                {/* Пульсирующая анимация для зон с высоким напряжением */}
                {zone.tension >= 7 && (
                  <circle cx={x} cy={y} r={size + 5} fill={color} opacity="0">
                    <animate attributeName="r" from={size} to={size + 10} dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.5" to="0" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}

                {/* Точка зажима */}
                <circle
                  cx={x}
                  cy={y}
                  r={isHovered ? size + 3 : size}
                  fill={color}
                  stroke="white"
                  strokeWidth="2"
                  opacity={isHovered ? 0.95 : 0.8}
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                  }}
                  onMouseEnter={() => setHoveredZone(zone.id)}
                  onMouseLeave={() => setHoveredZone(null)}
                >
                  <title>
                    {zone.name} — Напряжение: {zone.tension}/10
                    {zone.description ? ` — ${zone.description}` : ''}
                  </title>
                </circle>

                {/* Подпись зоны */}
                {showLabels && isHovered && (
                  <text
                    x={x}
                    y={y - size - 8}
                    textAnchor="middle"
                    fill="#333"
                    fontSize="10"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {zone.name}
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </Box>

      {/* Легенда */}
      <Box mt={4}>
        <VStack gap={2} align="stretch">
          <Box display="flex" justifyContent="space-between" fontSize="xs">
            <Box display="flex" alignItems="center" gap={2}>
              <Box width="12px" height="12px" borderRadius="full" bg="#48BB78" />
              <Text>Норма (0-2)</Text>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <Box width="12px" height="12px" borderRadius="full" bg="#ECC94B" />
              <Text>Легкое (3-4)</Text>
            </Box>
          </Box>
          <Box display="flex" justifyContent="space-between" fontSize="xs">
            <Box display="flex" alignItems="center" gap={2}>
              <Box width="12px" height="12px" borderRadius="full" bg="#ED8936" />
              <Text>Среднее (5-7)</Text>
            </Box>
            <Box display="flex" alignItems="center" gap={2}>
              <Box width="12px" height="12px" borderRadius="full" bg="#E53E3E" />
              <Text>Высокое (8-10)</Text>
            </Box>
          </Box>
        </VStack>
      </Box>

      {/* Статистика */}
      <Box mt={4} display="flex" justifyContent="center" gap={3}>
        <Badge colorPalette="red">Зон с высоким напряжением: {zones.filter((z) => z.tension >= 8).length}</Badge>
        <Badge colorPalette="orange">Средних: {zones.filter((z) => z.tension >= 5 && z.tension < 8).length}</Badge>
      </Box>
    </Box>
  )
}
