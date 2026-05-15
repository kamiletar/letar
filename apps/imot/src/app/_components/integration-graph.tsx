/* oxlint-disable no-array-index-key */
'use client'

import { imotColors } from '@/lib/theme'
import type { IntegrationAnalysis } from '@/lib/utils/integration-analysis'
import { Box, Text } from '@chakra-ui/react'
import { motion } from 'framer-motion'

/**
 * Компонент визуализации графа интеграции между 5 уровнями ИМОТ
 *
 * Отображает:
 * - 5 уровней диагностики по кругу
 * - Центральный круг "Интеграция" с общей оценкой
 * - Линии связей между уровнями (из intersections)
 * - Цветовое кодирование по приоритету
 */

interface IntegrationGraphProps {
  analysis: IntegrationAnalysis
}

// Конфигурация уровней
const levels = [
  { id: 'numerology', label: 'Нумерология', color: imotColors.numerology, emoji: '🔢' },
  { id: 'neuroPsych', label: 'Нейропсихология', color: imotColors.neuroPsych, emoji: '🧠' },
  { id: 'energy', label: 'Энергетика', color: imotColors.energy, emoji: '✨' },
  { id: 'body', label: 'Тело', color: imotColors.body, emoji: '🧘' },
  { id: 'style', label: 'Стиль', color: imotColors.style, emoji: '💎' },
]

// Размеры SVG
const WIDTH = 600
const HEIGHT = 600
const CENTER_X = WIDTH / 2
const CENTER_Y = HEIGHT / 2
const RADIUS = 200 // радиус для расположения уровней
const NODE_RADIUS = 50 // радиус узла уровня
const CENTER_RADIUS = 60 // радиус центрального круга

// Цвета приоритетов
const priorityColors = {
  high: '#E53E3E', // красный
  medium: '#DD6B20', // оранжевый
  low: '#38A169', // зеленый
}

export function IntegrationGraph({ analysis }: IntegrationGraphProps) {
  // Вычисляем позиции уровней по кругу
  const levelPositions = levels.map((level, index) => {
    const angle = (index * 2 * Math.PI) / levels.length - Math.PI / 2 // начинаем сверху
    const x = CENTER_X + RADIUS * Math.cos(angle)
    const y = CENTER_Y + RADIUS * Math.sin(angle)
    return { ...level, x, y }
  })

  // Создаем карту индексов уровней для быстрого поиска
  const levelIndexMap = new Map(levels.map((level, index) => [level.id, index]))

  // Подготавливаем линии связей
  const connections = analysis.intersections
    .map((intersection) => {
      const [level1, level2] = intersection.levels

      // Находим позиции уровней
      const pos1Index = levelIndexMap.get(level1)
      const pos2Index = levelIndexMap.get(level2)

      if (pos1Index === undefined || pos2Index === undefined) {
        return null
      }

      const pos1 = levelPositions[pos1Index]
      const pos2 = levelPositions[pos2Index]

      return {
        x1: pos1.x,
        y1: pos1.y,
        x2: pos2.x,
        y2: pos2.y,
        color: priorityColors[intersection.priority],
        priority: intersection.priority,
        theme: intersection.theme,
        strokeWidth: intersection.priority === 'high' ? 3 : intersection.priority === 'medium' ? 2 : 1,
      }
    })
    .filter((conn): conn is NonNullable<typeof conn> => conn !== null)

  return (
    <Box position="relative" width="100%" maxWidth="600px" mx="auto">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} style={{ width: '100%', height: 'auto' }}>
        {/* Определяем градиенты для центрального круга */}
        <defs>
          <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={imotColors.integration.primary} stopOpacity={0.8} />
            <stop offset="100%" stopColor={imotColors.integration.primary} stopOpacity={0.3} />
          </radialGradient>
        </defs>

        {/* Линии связей между уровнями */}
        <g>
          {/* oxlint-disable-next-line no-array-index-key */}
          {connections.map((connection, index) => (
            <motion.line
              key={index}
              x1={connection.x1}
              y1={connection.y1}
              x2={connection.x2}
              y2={connection.y2}
              stroke={connection.color}
              strokeWidth={connection.strokeWidth}
              strokeOpacity={0.6}
              strokeDasharray={connection.priority === 'low' ? '5,5' : '0'}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 0.6 }}
              transition={{ duration: 1, delay: index * 0.1 }}
            >
              <title>{connection.theme}</title>
            </motion.line>
          ))}
        </g>

        {/* Центральный круг "Интеграция" */}
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <circle
            cx={CENTER_X}
            cy={CENTER_Y}
            r={CENTER_RADIUS}
            fill="url(#centerGradient)"
            stroke={imotColors.integration.primary}
            strokeWidth={3}
          />
          <text x={CENTER_X} y={CENTER_Y - 10} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#2D3748">
            Интеграция
          </text>
          <text
            x={CENTER_X}
            y={CENTER_Y + 15}
            textAnchor="middle"
            fontSize="24"
            fontWeight="bold"
            fill={imotColors.integration.primary}
          >
            {analysis.overallIntegration}%
          </text>
        </motion.g>

        {/* Узлы уровней */}
        {levelPositions.map((level, index) => (
          <motion.g
            key={level.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
          >
            {/* Круг уровня */}
            <circle
              cx={level.x}
              cy={level.y}
              r={NODE_RADIUS}
              fill={level.color.primary}
              fillOpacity={0.15}
              stroke={level.color.primary}
              strokeWidth={3}
            />
            {/* Emoji */}
            <text x={level.x} y={level.y - 5} textAnchor="middle" fontSize="24">
              {level.emoji}
            </text>
            {/* Название */}
            <text x={level.x} y={level.y + 25} textAnchor="middle" fontSize="12" fontWeight="600" fill="#2D3748">
              {level.label}
            </text>
          </motion.g>
        ))}
      </svg>

      {/* Легенда приоритетов */}
      <Box mt={4} display="flex" justifyContent="center" gap={4} flexWrap="wrap">
        <Box display="flex" alignItems="center" gap={2}>
          <Box width="20px" height="3px" bg={priorityColors.high} />
          <Text fontSize="sm" color="gray.600">
            Высокий приоритет
          </Text>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Box width="20px" height="2px" bg={priorityColors.medium} />
          <Text fontSize="sm" color="gray.600">
            Средний приоритет
          </Text>
        </Box>
        <Box display="flex" alignItems="center" gap={2}>
          <Box width="20px" height="1px" bg={priorityColors.low} borderStyle="dashed" />
          <Text fontSize="sm" color="gray.600">
            Низкий приоритет
          </Text>
        </Box>
      </Box>
    </Box>
  )
}
