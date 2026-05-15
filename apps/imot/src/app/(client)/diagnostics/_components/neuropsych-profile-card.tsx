/* oxlint-disable no-array-index-key */
import { Box, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuBrain } from 'react-icons/lu'

type NeuroPsychProfile = {
  behaviorPatterns?: string | null
  cognitiveStyle?: string | null
  learningStyle?: string | null
  decisionMaking?: string | null
  defenseMechanisms?: string | null
  copingStrategies?: string | null
  emotionalPatterns?: string | null
  triggers?: string | null
  resourceStates?: string | null
  strengths?: string | null
  notes?: string | null
} | null

interface NeuroPsychProfileCardProps {
  profile: NeuroPsychProfile
}

/**
 * Карточка нейропсихологического профиля для клиента
 * Read-only отображение паттернов поведения и когнитивных особенностей
 */
export function NeuroPsychProfileCard({ profile }: NeuroPsychProfileCardProps) {
  const cardColor = '#4ECDC4' // Бирюзовый

  if (!profile) {
    return (
      <Box p={6} borderWidth="2px" borderColor={cardColor} borderRadius="lg" opacity={0.6}>
        <VStack gap={3} alignItems="center">
          <LuBrain size={32} color={cardColor} />
          <Text fontSize="lg" fontWeight="medium">
            Нейропсихология
          </Text>
          <Text color="fg.muted" textAlign="center">
            Профиль еще не заполнен
          </Text>
        </VStack>
      </Box>
    )
  }

  // Парсинг JSON данных
  let behaviorPatterns: string[] = []
  let defenseMechanisms: string[] = []
  let resourceStates: string[] = []

  try {
    if (profile.behaviorPatterns) {
      behaviorPatterns = JSON.parse(profile.behaviorPatterns)
    }
    if (profile.defenseMechanisms) {
      defenseMechanisms = JSON.parse(profile.defenseMechanisms)
    }
    if (profile.resourceStates) {
      resourceStates = JSON.parse(profile.resourceStates)
    }
  } catch (error) {
    console.error('Ошибка парсинга JSON:', error)
  }

  return (
    <Box p={6} borderWidth="2px" borderColor={cardColor} borderRadius="lg" bg={`${cardColor}08`}>
      <VStack gap={4} align="stretch">
        {/* Заголовок */}
        <Box display="flex" alignItems="center" gap={2}>
          <LuBrain size={24} color={cardColor} />
          <Text fontSize="xl" fontWeight="bold" color={cardColor}>
            Нейропсихология
          </Text>
        </Box>

        {/* Когнитивные особенности */}
        <SimpleGrid columns={1} gap={3}>
          {profile.cognitiveStyle && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
                Стиль мышления
              </Text>
              <Text>{profile.cognitiveStyle}</Text>
            </Box>
          )}

          {profile.learningStyle && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
                Стиль обучения
              </Text>
              <Text>{profile.learningStyle}</Text>
            </Box>
          )}

          {profile.decisionMaking && (
            <Box>
              <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
                Принятие решений
              </Text>
              <Text>{profile.decisionMaking}</Text>
            </Box>
          )}
        </SimpleGrid>

        {/* Паттерны поведения */}
        {behaviorPatterns.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
              Паттерны поведения
            </Text>
            <VStack gap={1} align="stretch">
              {behaviorPatterns.map((pattern, index) => (
                <Box key={index} p={2} bg="bg.muted" borderRadius="md" fontSize="sm">
                  {pattern}
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {/* Защитные механизмы */}
        {defenseMechanisms.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
              Защитные механизмы
            </Text>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {defenseMechanisms.map((mechanism, index) => (
                <Box key={index} px={3} py={1} bg="bg.muted" borderRadius="full" fontSize="sm">
                  {mechanism}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Стратегии совладания */}
        {profile.copingStrategies && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Стратегии совладания
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.copingStrategies}
            </Text>
          </Box>
        )}

        {/* Эмоциональные паттерны */}
        {profile.emotionalPatterns && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Эмоциональные паттерны
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.emotionalPatterns}
            </Text>
          </Box>
        )}

        {/* Триггеры */}
        {profile.triggers && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Триггеры
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.triggers}
            </Text>
          </Box>
        )}

        {/* Ресурсные состояния */}
        {resourceStates.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
              Ресурсные состояния
            </Text>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {resourceStates.map((state, index) => (
                <Box key={index} px={3} py={1} bg={cardColor} color="white" borderRadius="full" fontSize="sm">
                  {state}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Сильные стороны */}
        {profile.strengths && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Сильные стороны
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.strengths}
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  )
}
