/* oxlint-disable no-array-index-key */
'use client'

import { Box, Text } from '@chakra-ui/react'
import { useState } from 'react'

/**
 * Типы чакр
 */
export type ChakraType = 'ROOT' | 'SACRAL' | 'SOLAR_PLEXUS' | 'HEART' | 'THROAT' | 'THIRD_EYE' | 'CROWN'

/**
 * Данные чакры
 */
export interface ChakraData {
  type: ChakraType
  level: number // 1-10
  blockDescription?: string
}

export interface ChakraWheelProps {
  /**
   * Данные чакр (массив из 7 элементов)
   */
  chakras: ChakraData[]

  /**
   * Размер колеса
   */
  size?: number

  /**
   * Интерактивность (показывать подсказки)
   */
  interactive?: boolean
}

/**
 * Конфигурация чакр: цвет, название, позиция
 */
const chakraConfig: Record<ChakraType, { color: string; name: string; position: number }> = {
  ROOT: { color: '#E53E3E', name: 'Муладхара (Корневая)', position: 0 },
  SACRAL: { color: '#ED8936', name: 'Свадхистана (Сакральная)', position: 1 },
  SOLAR_PLEXUS: { color: '#ECC94B', name: 'Манипура (Солнечное сплетение)', position: 2 },
  HEART: { color: '#48BB78', name: 'Анахата (Сердечная)', position: 3 },
  THROAT: { color: '#4299E1', name: 'Вишудха (Горловая)', position: 4 },
  THIRD_EYE: { color: '#805AD5', name: 'Аджна (Третий глаз)', position: 5 },
  CROWN: { color: '#D53F8C', name: 'Сахасрара (Коронная)', position: 6 },
}

/**
 * Интерактивное колесо чакр для визуализации энергетического состояния
 */
export function ChakraWheel({ chakras, size = 400, interactive = true }: ChakraWheelProps) {
  const [hoveredChakra, setHoveredChakra] = useState<ChakraType | null>(null)

  const centerX = size / 2
  const centerY = size / 2
  const maxRadius = size / 2 - 40
  const minRadius = 20

  return (
    <Box position="relative" width={`${size}px`} height={`${size}px`} mx="auto">
      <svg width={size} height={size}>
        {/* Фоновые круги для визуального эффекта */}
        {/* oxlint-disable-next-line no-array-index-key */}
        {[0.2, 0.4, 0.6, 0.8, 1].map((factor, index) => (
          <circle
            key={index}
            cx={centerX}
            cy={centerY}
            r={maxRadius * factor}
            fill="none"
            stroke="#f0f0f0"
            strokeWidth="1"
            opacity={0.3}
          />
        ))}

        {/* Чакры */}
        {chakras.map((chakra) => {
          const config = chakraConfig[chakra.type]
          const radius = minRadius + (chakra.level / 10) * (maxRadius - minRadius)
          const angle = (config.position / 7) * 2 * Math.PI - Math.PI / 2
          const x = centerX + radius * Math.cos(angle)
          const y = centerY + radius * Math.sin(angle)

          const isHovered = hoveredChakra === chakra.type
          const circleRadius = isHovered ? 35 : 30

          return (
            <g key={chakra.type}>
              {/* Линия от центра */}
              <line x1={centerX} y1={centerY} x2={x} y2={y} stroke={config.color} strokeWidth="2" opacity={0.3} />

              {/* Круг чакры */}
              <circle
                cx={x}
                cy={y}
                r={circleRadius}
                fill={config.color}
                opacity={isHovered ? 0.9 : 0.7}
                stroke="white"
                strokeWidth="3"
                style={{
                  cursor: interactive ? 'pointer' : 'default',
                  transition: 'all 0.3s ease',
                }}
                onMouseEnter={() => interactive && setHoveredChakra(chakra.type)}
                onMouseLeave={() => interactive && setHoveredChakra(null)}
              >
                {interactive && (
                  <title>
                    {config.name} — Уровень: {chakra.level}/10
                    {chakra.blockDescription ? ` — ${chakra.blockDescription}` : ''}
                  </title>
                )}
              </circle>

              {/* Уровень чакры (текст) */}
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="14"
                fontWeight="bold"
                pointerEvents="none"
              >
                {chakra.level}
              </text>
            </g>
          )
        })}

        {/* Центральный круг */}
        <circle cx={centerX} cy={centerY} r="15" fill="#667eea" opacity="0.8" />
      </svg>

      {/* Легенда */}
      <Box
        position="absolute"
        bottom="0"
        left="0"
        right="0"
        display="flex"
        justifyContent="center"
        flexWrap="wrap"
        gap={2}
        fontSize="xs"
      >
        {chakras.map((chakra) => {
          const config = chakraConfig[chakra.type]
          return (
            <Box
              key={chakra.type}
              display="flex"
              alignItems="center"
              gap={1}
              px={2}
              py={1}
              bg="white"
              borderRadius="md"
              opacity={hoveredChakra === chakra.type || !hoveredChakra ? 1 : 0.5}
              transition="opacity 0.2s ease"
            >
              <Box width="10px" height="10px" borderRadius="full" bg={config.color} />
              <Text>{config.name.split(' ')[0]}</Text>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}
