/* oxlint-disable no-array-index-key */
'use client'

import type { IntegrationAnalysis } from '@/lib/utils/integration-analysis'
import { Box, Heading, Tabs, Text, VStack } from '@chakra-ui/react'
import { IntegrationGraph } from './integration-graph'
import { IntegrationHighlights } from './integration-highlights'

/**
 * Полный компонент отчета об интеграции между уровнями ИМОТ
 *
 * Объединяет:
 * - Визуализацию графа связей
 * - Ключевые точки трансформации
 * - Детальный анализ
 */

interface IntegrationReportProps {
  analysis: IntegrationAnalysis
}

export function IntegrationReport({ analysis }: IntegrationReportProps) {
  return (
    <Box>
      <Heading size="lg" mb={6} color="gray.800">
        📊 Анализ интеграции
      </Heading>

      <Tabs.Root defaultValue="highlights" variant="enclosed">
        <Tabs.List mb={4}>
          <Tabs.Trigger value="highlights">💡 Ключевые находки</Tabs.Trigger>
          <Tabs.Trigger value="graph">🔗 Граф связей</Tabs.Trigger>
          <Tabs.Trigger value="details">📋 Детальный анализ</Tabs.Trigger>
        </Tabs.List>

        {/* Вкладка: Ключевые находки */}
        <Tabs.Content value="highlights">
          <IntegrationHighlights analysis={analysis} />
        </Tabs.Content>

        {/* Вкладка: Граф связей */}
        <Tabs.Content value="graph">
          <VStack align="stretch" gap={4}>
            <Box p={6} bg="white" borderRadius="lg" boxShadow="md">
              <Heading size="md" mb={4} textAlign="center" color="gray.700">
                Визуализация связей между уровнями
              </Heading>
              <Text fontSize="sm" color="gray.600" textAlign="center" mb={6}>
                Граф показывает точки пересечения между 5 уровнями диагностики. Толщина и цвет линий соответствуют
                приоритету работы.
              </Text>
              <IntegrationGraph analysis={analysis} />
            </Box>
          </VStack>
        </Tabs.Content>

        {/* Вкладка: Детальный анализ */}
        <Tabs.Content value="details">
          <VStack align="stretch" gap={6}>
            {/* Все точки пересечения */}
            <Box p={6} bg="white" borderRadius="lg" boxShadow="md">
              <Heading size="md" mb={4} color="gray.700">
                Все точки пересечения ({analysis.intersections.length})
              </Heading>
              <VStack align="stretch" gap={3}>
                {/* oxlint-disable-next-line no-array-index-key */}
                {analysis.intersections.map((intersection, index) => (
                  <Box
                    key={index}
                    p={4}
                    bg="gray.50"
                    borderRadius="md"
                    borderLeftWidth="4px"
                    borderLeftColor={
                      intersection.priority === 'high'
                        ? 'red.500'
                        : intersection.priority === 'medium'
                          ? 'orange.500'
                          : 'green.500'
                    }
                  >
                    <Text fontWeight="bold" color="gray.800" mb={1}>
                      {intersection.theme}
                    </Text>
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      {intersection.description}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      Уровни: {intersection.levels.join(' ↔ ')} | Приоритет:{' '}
                      {intersection.priority === 'high'
                        ? 'Высокий'
                        : intersection.priority === 'medium'
                          ? 'Средний'
                          : 'Низкий'}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </Box>

            {/* Все паттерны */}
            {analysis.patterns.length > 0 && (
              <Box p={6} bg="white" borderRadius="lg" boxShadow="md">
                <Heading size="md" mb={4} color="gray.700">
                  Выявленные паттерны ({analysis.patterns.length})
                </Heading>
                <VStack align="stretch" gap={4}>
                  {/* oxlint-disable-next-line no-array-index-key */}
                  {analysis.patterns.map((pattern, index) => (
                    <Box key={index} p={4} bg="gray.50" borderRadius="md">
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
                    </Box>
                  ))}
                </VStack>
              </Box>
            )}

            {/* Все рекомендации */}
            <Box p={6} bg="white" borderRadius="lg" boxShadow="md">
              <Heading size="md" mb={4} color="gray.700">
                Рекомендации ({analysis.recommendations.length})
              </Heading>
              <VStack align="stretch" gap={2}>
                {/* oxlint-disable-next-line no-array-index-key */}
                {analysis.recommendations.map((recommendation, index) => (
                  <Box key={index} p={3} bg="gray.50" borderRadius="md">
                    <Text color="gray.700">
                      {index + 1}. {recommendation}
                    </Text>
                  </Box>
                ))}
              </VStack>
            </Box>
          </VStack>
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  )
}
