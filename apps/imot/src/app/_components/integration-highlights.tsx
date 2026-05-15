/* oxlint-disable no-array-index-key, no-explicit-any */
'use client'

import { imotColors } from '@/lib/theme'
import type { IntegrationAnalysis } from '@/lib/utils/integration-analysis'
import { Badge, Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { motion } from 'framer-motion'

/**
 * Компонент отображения ключевых точек трансформации
 *
 * Показывает самые важные находки анализа интеграции:
 * - Точки пересечения высокого приоритета
 * - Выявленные паттерны
 * - Ключевые рекомендации
 */

interface IntegrationHighlightsProps {
  analysis: IntegrationAnalysis
}

const MotionBox = motion(Box)

const priorityConfig = {
  high: { color: 'red', label: 'Высокий приоритет', emoji: '🔴' },
  medium: { color: 'orange', label: 'Средний приоритет', emoji: '🟠' },
  low: { color: 'green', label: 'Низкий приоритет', emoji: '🟢' },
}

export function IntegrationHighlights({ analysis }: IntegrationHighlightsProps) {
  // Отбираем пересечения высокого приоритета
  const highPriorityIntersections = analysis.intersections.filter((i) => i.priority === 'high')

  // Топ-3 паттерна
  const topPatterns = analysis.patterns.slice(0, 3)

  // Топ-3 рекомендации
  const topRecommendations = analysis.recommendations.slice(0, 3)

  return (
    <VStack align="stretch" gap={6}>
      {/* Общая оценка интеграции */}
      <MotionBox
        p={6}
        bg="white"
        borderRadius="lg"
        borderWidth="2px"
        borderColor={imotColors.integration.primary}
        textAlign="center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 } as any}
      >
        <Text fontSize="sm" color="gray.600" mb={2}>
          Общая целостность
        </Text>
        <Heading
          size="3xl"
          bgGradient={`linear(to-r, ${imotColors.integration.primary}, ${imotColors.numerology.primary})`}
          bgClip="text"
        >
          {analysis.overallIntegration}%
        </Heading>
        <Text fontSize="sm" color="gray.500" mt={2}>
          {analysis.overallIntegration >= 80
            ? 'Высокая степень интеграции - все уровни гармонично связаны'
            : analysis.overallIntegration >= 60
              ? 'Хорошая интеграция - основные уровни заполнены'
              : analysis.overallIntegration >= 40
                ? 'Средняя интеграция - рекомендуется заполнить недостающие профили'
                : 'Низкая интеграция - необходимо заполнить больше профилей для анализа'}
        </Text>
      </MotionBox>

      {/* Ключевые точки пересечения */}
      {highPriorityIntersections.length > 0 && (
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 } as any}
        >
          <Heading size="md" mb={4} color="gray.700">
            🎯 Ключевые точки трансформации
          </Heading>
          <VStack align="stretch" gap={3}>
            {/* oxlint-disable-next-line no-array-index-key */}
            {highPriorityIntersections.map((intersection, index) => (
              <MotionBox
                key={index}
                p={4}
                bg="white"
                borderRadius="md"
                borderLeftWidth="4px"
                borderLeftColor="red.500"
                boxShadow="sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.2 + index * 0.1 } as any}
              >
                <HStack mb={2} justify="space-between">
                  <Text fontWeight="bold" color="gray.800">
                    {intersection.theme}
                  </Text>
                  <Badge colorPalette={priorityConfig[intersection.priority].color}>
                    {priorityConfig[intersection.priority].emoji} {priorityConfig[intersection.priority].label}
                  </Badge>
                </HStack>
                <Text fontSize="sm" color="gray.600">
                  {intersection.description}
                </Text>
                <Text fontSize="xs" color="gray.400" mt={2}>
                  Уровни: {intersection.levels.join(' ↔ ')}
                </Text>
              </MotionBox>
            ))}
          </VStack>
        </MotionBox>
      )}

      {/* Выявленные паттерны */}
      {topPatterns.length > 0 && (
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 } as any}
        >
          <Heading size="md" mb={4} color="gray.700">
            🔍 Выявленные паттерны
          </Heading>
          <VStack align="stretch" gap={3}>
            {/* oxlint-disable-next-line no-array-index-key */}
            {topPatterns.map((pattern, index) => (
              <MotionBox
                key={index}
                p={4}
                bg="white"
                borderRadius="md"
                borderLeftWidth="4px"
                borderLeftColor={imotColors.neuroPsych.primary}
                boxShadow="sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + index * 0.1 } as any}
              >
                <Text fontWeight="bold" color="gray.800" mb={2}>
                  {pattern.pattern}
                </Text>
                <Box mb={2}>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={1}>
                    Проявления:
                  </Text>
                  <VStack align="stretch" gap={1}>
                    {/* oxlint-disable-next-line no-array-index-key */}
                    {pattern.manifestations.map((manifestation, idx) => (
                      <Text key={idx} fontSize="sm" color="gray.600" pl={3}>
                        • {manifestation}
                      </Text>
                    ))}
                  </VStack>
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" color="gray.600" mb={1}>
                    Возможная причина:
                  </Text>
                  <Text fontSize="sm" color="gray.600" fontStyle="italic">
                    {pattern.rootCause}
                  </Text>
                </Box>
              </MotionBox>
            ))}
          </VStack>
        </MotionBox>
      )}

      {/* Ключевые рекомендации */}
      {topRecommendations.length > 0 && (
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 } as any}
        >
          <Heading size="md" mb={4} color="gray.700">
            💡 Ключевые рекомендации
          </Heading>
          <VStack align="stretch" gap={3}>
            {/* oxlint-disable-next-line no-array-index-key */}
            {topRecommendations.map((recommendation, index) => (
              <MotionBox
                key={index}
                p={4}
                bg="white"
                borderRadius="md"
                borderLeftWidth="4px"
                borderLeftColor={imotColors.integration.primary}
                boxShadow="sm"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 } as any}
              >
                <HStack>
                  <Text fontWeight="bold" color={imotColors.integration.primary}>
                    {index + 1}.
                  </Text>
                  <Text color="gray.700">{recommendation}</Text>
                </HStack>
              </MotionBox>
            ))}
          </VStack>
        </MotionBox>
      )}

      {/* Ресурсы и области роста */}
      <HStack align="start" gap={4}>
        {/* Ресурсы */}
        {analysis.resources.length > 0 && (
          <MotionBox
            flex={1}
            p={4}
            bg="green.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="green.200"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 } as any}
          >
            <Heading size="sm" mb={3} color="green.700">
              ✨ Ресурсы
            </Heading>
            <VStack align="stretch" gap={2}>
              {/* oxlint-disable-next-line no-array-index-key */}
              {analysis.resources.map((resource, index) => (
                <Text key={index} fontSize="sm" color="green.800">
                  • {resource}
                </Text>
              ))}
            </VStack>
          </MotionBox>
        )}

        {/* Области роста */}
        {analysis.growthAreas.length > 0 && (
          <MotionBox
            flex={1}
            p={4}
            bg="blue.50"
            borderRadius="md"
            borderWidth="1px"
            borderColor="blue.200"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.5 } as any}
          >
            <Heading size="sm" mb={3} color="blue.700">
              🌱 Области роста
            </Heading>
            <VStack align="stretch" gap={2}>
              {/* oxlint-disable-next-line no-array-index-key */}
              {analysis.growthAreas.map((area, index) => (
                <Text key={index} fontSize="sm" color="blue.800">
                  • {area}
                </Text>
              ))}
            </VStack>
          </MotionBox>
        )}
      </HStack>
    </VStack>
  )
}
