'use client'

import { Box, Progress as ChakraProgress, HStack, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuActivity, LuBrain, LuHeart, LuSparkles, LuUser } from 'react-icons/lu'

type ProfileStatus = 'empty' | 'partial' | 'complete'

interface ProfileData {
  numerology: ProfileStatus
  neuroPsych: ProfileStatus
  energy: ProfileStatus
  body: ProfileStatus
  style: ProfileStatus
}

interface ProfileCompletionDashboardProps {
  profiles: ProfileData
}

const PROFILE_CONFIG = [
  {
    key: 'numerology' as const,
    title: '1. Нумерология',
    subtitle: 'Матрица судьбы',
    icon: LuSparkles,
    color: '#FF6B6B',
  },
  {
    key: 'neuroPsych' as const,
    title: '2. Нейропсихология',
    subtitle: 'Паттерны поведения',
    icon: LuBrain,
    color: '#4ECDC4',
  },
  {
    key: 'energy' as const,
    title: '3. Энергетика',
    subtitle: '7 чакр',
    icon: LuActivity,
    color: '#FFE66D',
  },
  {
    key: 'body' as const,
    title: '4. Тело',
    subtitle: 'Карта зажимов',
    icon: LuHeart,
    color: '#95E1D3',
  },
  {
    key: 'style' as const,
    title: '5. Стиль',
    subtitle: 'Цветотип и архетип',
    icon: LuUser,
    color: '#F38181',
  },
]

function getStatusText(status: ProfileStatus) {
  switch (status) {
    case 'complete':
      return { text: '✓ Заполнен', color: 'green.600' }
    case 'partial':
      return { text: '⚠ Частично заполнен', color: 'orange.500' }
    case 'empty':
      return { text: '⚠ Не заполнен', color: 'fg.muted' }
  }
}

function calculateCompletionPercentage(profiles: ProfileData): number {
  const statuses = Object.values(profiles)
  const completeCount = statuses.filter((s) => s === 'complete').length
  const partialCount = statuses.filter((s) => s === 'partial').length

  // Полные профили = 100% за каждый (20% на профиль)
  // Частичные профили = 50% (10% на профиль)
  return completeCount * 20 + partialCount * 10
}

/**
 * Dashboard прогресса заполнения диагностических профилей
 * Отображает статус заполнения всех 5 уровней ИМОТ
 */
export function ProfileCompletionDashboard({ profiles }: ProfileCompletionDashboardProps) {
  const completionPercentage = calculateCompletionPercentage(profiles)
  const allComplete = completionPercentage === 100

  return (
    <Box p={6} borderWidth="1px" borderRadius="lg" bg="bg.muted">
      <VStack gap={6} align="stretch">
        {/* Заголовок и общий прогресс */}
        <Box>
          <HStack justify="space-between" mb={2}>
            <Text fontSize="lg" fontWeight="bold">
              Прогресс диагностики
            </Text>
            <Text fontSize="lg" fontWeight="bold" color={allComplete ? 'green.600' : 'fg'}>
              {completionPercentage}%
            </Text>
          </HStack>
          <ChakraProgress.Root value={completionPercentage} size="lg" colorPalette={allComplete ? 'green' : 'blue'}>
            <ChakraProgress.Track borderRadius="full">
              <ChakraProgress.Range />
            </ChakraProgress.Track>
          </ChakraProgress.Root>
          {allComplete && (
            <Text fontSize="sm" color="green.600" mt={2} fontWeight="medium">
              🎉 Все профили заполнены! Ваша диагностика завершена.
            </Text>
          )}
        </Box>

        {/* Статус каждого профиля */}
        <SimpleGrid columns={{ base: 1, md: 2 }} gap={3}>
          {PROFILE_CONFIG.map((config) => {
            const status = profiles[config.key]
            const statusInfo = getStatusText(status)
            const Icon = config.icon

            return (
              <Box
                key={config.key}
                p={4}
                borderWidth="1px"
                borderRadius="md"
                borderColor={status === 'complete' ? config.color : 'border'}
                bg={status === 'complete' ? `${config.color}08` : 'bg'}
                transition="all 0.2s"
              >
                <HStack gap={3}>
                  <Box flexShrink={0}>
                    <Icon size={24} color={config.color} style={{ opacity: status === 'empty' ? 0.3 : 1 }} />
                  </Box>
                  <Box flex={1}>
                    <Text fontWeight="medium" fontSize="sm">
                      {config.title}
                    </Text>
                    <Text fontSize="xs" color="fg.muted">
                      {config.subtitle}
                    </Text>
                  </Box>
                  <Box flexShrink={0}>
                    <Text fontSize="xs" color={statusInfo.color} fontWeight="medium">
                      {statusInfo.text}
                    </Text>
                  </Box>
                </HStack>
              </Box>
            )
          })}
        </SimpleGrid>

        {/* Подсказка */}
        {!allComplete && (
          <Box p={3} bg="blue.50" borderRadius="md">
            <Text fontSize="sm" color="blue.800">
              💡 Профили заполняются вашим специалистом после диагностических сессий. Заполненные разделы появятся ниже.
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  )
}
