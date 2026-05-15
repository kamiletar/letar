/* oxlint-disable no-array-index-key */
'use client'

import { Box, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuActivity, LuBookOpen, LuCircle, LuCircleCheck, LuLightbulb, LuSparkles, LuTarget } from 'react-icons/lu'

type TransformationPlan = {
  id: string
  currentStage: string
  diagnosticsDescription?: string | null
  integrationDescription?: string | null
  strategyDescription?: string | null
  practiceDescription?: string | null
  expectedResults?: string | null
  keyPoints?: string | null
  priorities?: string | null
  startDate?: Date | null
  expectedEndDate?: Date | null
  isActive: boolean
  isCompleted: boolean
  notes?: string | null
  createdAt: Date
  updatedAt: Date
}

interface TransformationPlanViewProps {
  plan: TransformationPlan
}

// Определение этапов
const stages = [
  {
    id: 'DIAGNOSTICS',
    name: 'Диагностика',
    icon: LuSparkles,
    color: '#FF6B6B',
    description: 'Комплексный анализ всех 5 уровней',
  },
  {
    id: 'INTEGRATION',
    name: 'Интеграция',
    icon: LuLightbulb,
    color: '#4ECDC4',
    description: 'Нахождение точек пересечения',
  },
  {
    id: 'STRATEGY',
    name: 'Стратегия',
    icon: LuTarget,
    color: '#FFE66D',
    description: 'Индивидуальный план трансформации',
  },
  {
    id: 'PRACTICE',
    name: 'Практика',
    icon: LuActivity,
    color: '#95E1D3',
    description: 'Работа на всех уровнях одновременно',
  },
  {
    id: 'RESULT',
    name: 'Результат',
    icon: LuCircleCheck,
    color: '#667eea',
    description: 'Устойчивые изменения во всех сферах',
  },
]

/**
 * Компонент отображения плана трансформации для клиента
 */
export function TransformationPlanView({ plan }: TransformationPlanViewProps) {
  // Индекс текущего этапа
  const currentStageIndex = stages.findIndex((s) => s.id === plan.currentStage)

  // Прогресс в процентах
  const progress = ((currentStageIndex + 1) / stages.length) * 100

  // Парсинг JSON данных
  let keyPoints: string[] = []
  let priorities: string[] = []

  try {
    if (plan.keyPoints) {
      keyPoints = JSON.parse(plan.keyPoints)
    }
    if (plan.priorities) {
      priorities = JSON.parse(plan.priorities)
    }
  } catch (error) {
    console.error('Ошибка парсинга JSON:', error)
  }

  return (
    <VStack gap={8} align="stretch">
      {/* Прогресс-бар */}
      <Box>
        <Box display="flex" justifyContent="space-between" mb={2}>
          <Text fontWeight="medium">Прогресс трансформации</Text>
          <Text fontWeight="bold" color="#667eea">
            {Math.round(progress)}%
          </Text>
        </Box>
        <Box h="16px" bg="bg.muted" borderRadius="full" overflow="hidden">
          <Box
            h="100%"
            w={`${progress}%`}
            bg="linear-gradient(90deg, #667eea 0%, #764ba2 100%)"
            transition="width 0.5s"
          />
        </Box>
      </Box>

      {/* Этапы */}
      <Box>
        <Text fontSize="lg" fontWeight="medium" mb={4}>
          Этапы трансформации
        </Text>
        <VStack gap={4} align="stretch">
          {stages.map((stage, index) => {
            const Icon = stage.icon
            const isCompleted = index < currentStageIndex
            const isCurrent = index === currentStageIndex
            const isPending = index > currentStageIndex

            // Получение описания этапа из плана
            let stageDescription = ''
            switch (stage.id) {
              case 'DIAGNOSTICS':
                stageDescription = plan.diagnosticsDescription || ''
                break
              case 'INTEGRATION':
                stageDescription = plan.integrationDescription || ''
                break
              case 'STRATEGY':
                stageDescription = plan.strategyDescription || ''
                break
              case 'PRACTICE':
                stageDescription = plan.practiceDescription || ''
                break
              case 'RESULT':
                stageDescription = plan.expectedResults || ''
                break
            }

            return (
              <Box
                key={stage.id}
                p={4}
                borderWidth="2px"
                borderColor={isCurrent ? stage.color : 'border'}
                borderRadius="lg"
                bg={isCurrent ? `${stage.color}08` : 'transparent'}
                opacity={isPending ? 0.6 : 1}
              >
                <HStack gap={3} align="start">
                  {/* Иконка этапа */}
                  <Box flexShrink={0} pt={1}>
                    {isCompleted ? (
                      <LuCircleCheck size={24} color="#00A878" />
                    ) : isCurrent ? (
                      <Icon size={24} color={stage.color} />
                    ) : (
                      <LuCircle size={24} color="gray" />
                    )}
                  </Box>

                  {/* Контент */}
                  <Box flex={1}>
                    <HStack justify="space-between" mb={1}>
                      <Text fontSize="lg" fontWeight="bold" color={stage.color}>
                        {index + 1}. {stage.name}
                      </Text>
                      {isCurrent && (
                        <Box
                          px={3}
                          py={1}
                          bg={stage.color}
                          color="white"
                          borderRadius="full"
                          fontSize="xs"
                          fontWeight="medium"
                        >
                          Текущий этап
                        </Box>
                      )}
                      {isCompleted && (
                        <Box
                          px={3}
                          py={1}
                          bg="#00A878"
                          color="white"
                          borderRadius="full"
                          fontSize="xs"
                          fontWeight="medium"
                        >
                          Завершено
                        </Box>
                      )}
                    </HStack>
                    <Text fontSize="sm" color="fg.muted" mb={2}>
                      {stage.description}
                    </Text>

                    {/* Описание из плана */}
                    {stageDescription && (
                      <Text fontSize="sm" whiteSpace="pre-wrap">
                        {stageDescription}
                      </Text>
                    )}
                  </Box>
                </HStack>
              </Box>
            )
          })}
        </VStack>
      </Box>

      {/* Ключевые точки трансформации */}
      {keyPoints.length > 0 && (
        <Box p={6} borderWidth="1px" borderRadius="lg" bg="bg.subtle">
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <LuBookOpen size={20} color="#667eea" />
            <Text fontSize="lg" fontWeight="medium">
              Ключевые точки трансформации
            </Text>
          </Box>
          <VStack gap={2} align="stretch">
            {keyPoints.map((point, index) => (
              <Box key={index} display="flex" gap={2} p={3} bg="bg" borderRadius="md">
                <Text fontWeight="bold" color="#667eea">
                  {index + 1}.
                </Text>
                <Text>{point}</Text>
              </Box>
            ))}
          </VStack>
        </Box>
      )}

      {/* Приоритеты работы */}
      {priorities.length > 0 && (
        <Box p={6} borderWidth="1px" borderRadius="lg" bg="bg.subtle">
          <Box display="flex" alignItems="center" gap={2} mb={3}>
            <LuTarget size={20} color="#667eea" />
            <Text fontSize="lg" fontWeight="medium">
              Приоритеты работы
            </Text>
          </Box>
          <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
            {priorities.map((priority, index) => (
              <Box
                key={index}
                p={3}
                bg="#667eea"
                color="white"
                borderRadius="md"
                display="flex"
                alignItems="center"
                gap={2}
              >
                <Box
                  w="24px"
                  h="24px"
                  bg="white"
                  color="#667eea"
                  borderRadius="full"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontWeight="bold"
                  fontSize="sm"
                  flexShrink={0}
                >
                  {index + 1}
                </Box>
                <Text fontSize="sm">{priority}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Box>
      )}

      {/* Временные рамки */}
      {(plan.startDate || plan.expectedEndDate) && (
        <Box p={4} borderWidth="1px" borderRadius="lg">
          <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
            Временные рамки
          </Text>
          <SimpleGrid columns={2} gap={4}>
            {plan.startDate && (
              <Box>
                <Text fontSize="xs" color="fg.muted" mb={1}>
                  Дата начала
                </Text>
                <Text fontWeight="medium">{new Date(plan.startDate).toLocaleDateString('ru-RU')}</Text>
              </Box>
            )}
            {plan.expectedEndDate && (
              <Box>
                <Text fontSize="xs" color="fg.muted" mb={1}>
                  Ожидаемое завершение
                </Text>
                <Text fontWeight="medium">{new Date(plan.expectedEndDate).toLocaleDateString('ru-RU')}</Text>
              </Box>
            )}
          </SimpleGrid>
        </Box>
      )}
    </VStack>
  )
}
