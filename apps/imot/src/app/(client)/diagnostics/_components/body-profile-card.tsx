/* oxlint-disable no-array-index-key */
import { Box, Text, VStack } from '@chakra-ui/react'
import { LuHeart } from 'react-icons/lu'

type BodyProfile = {
  tensionMap?: string | null
  tensionAreas?: string | null
  psychosomaticIssues?: string | null
  symptoms?: string | null
  chronicConditions?: string | null
  breathingPatterns?: string | null
  breathingIssues?: string | null
  bodyResources?: string | null
  physicalStrengths?: string | null
  bodyMindConnection?: string | null
  bodyMessages?: string | null
  notes?: string | null
} | null

interface BodyProfileCardProps {
  profile: BodyProfile
}

/**
 * Карточка телесного профиля для клиента
 * Read-only отображение карты зажимов и психосоматики
 */
export function BodyProfileCard({ profile }: BodyProfileCardProps) {
  const cardColor = '#95E1D3' // Мятный

  if (!profile) {
    return (
      <Box p={6} borderWidth="2px" borderColor={cardColor} borderRadius="lg" opacity={0.6}>
        <VStack gap={3} alignItems="center">
          <LuHeart size={32} color={cardColor} />
          <Text fontSize="lg" fontWeight="medium">
            Тело
          </Text>
          <Text color="fg.muted" textAlign="center">
            Профиль еще не заполнен
          </Text>
        </VStack>
      </Box>
    )
  }

  // Парсинг JSON данных
  let psychosomaticIssues: string[] = []

  try {
    if (profile.psychosomaticIssues) {
      psychosomaticIssues = JSON.parse(profile.psychosomaticIssues)
    }
  } catch (error) {
    console.error('Ошибка парсинга JSON:', error)
  }

  return (
    <Box p={6} borderWidth="2px" borderColor={cardColor} borderRadius="lg" bg={`${cardColor}08`}>
      <VStack gap={4} align="stretch">
        {/* Заголовок */}
        <Box display="flex" alignItems="center" gap={2}>
          <LuHeart size={24} color={cardColor} />
          <Text fontSize="xl" fontWeight="bold" color={cardColor}>
            Тело
          </Text>
        </Box>

        {/* Области зажимов */}
        {profile.tensionAreas && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Области зажимов
            </Text>
            <Text whiteSpace="pre-wrap">{profile.tensionAreas}</Text>
          </Box>
        )}

        {/* Психосоматические проявления */}
        {psychosomaticIssues.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
              Психосоматические проявления
            </Text>
            <VStack gap={1} align="stretch">
              {psychosomaticIssues.map((issue, index) => (
                <Box key={index} p={2} bg="bg.muted" borderRadius="md" fontSize="sm">
                  • {issue}
                </Box>
              ))}
            </VStack>
          </Box>
        )}

        {/* Симптомы */}
        {profile.symptoms && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Симптомы
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.symptoms}
            </Text>
          </Box>
        )}

        {/* Хронические состояния */}
        {profile.chronicConditions && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Хронические состояния
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.chronicConditions}
            </Text>
          </Box>
        )}

        {/* Паттерны дыхания */}
        {profile.breathingPatterns && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Паттерны дыхания
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.breathingPatterns}
            </Text>
          </Box>
        )}

        {/* Проблемы с дыханием */}
        {profile.breathingIssues && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Проблемы с дыханием
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.breathingIssues}
            </Text>
          </Box>
        )}

        {/* Телесные ресурсы */}
        {profile.bodyResources && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Телесные ресурсы
            </Text>
            <Box p={3} bg={cardColor} color="black" borderRadius="md">
              <Text fontSize="sm" whiteSpace="pre-wrap">
                {profile.bodyResources}
              </Text>
            </Box>
          </Box>
        )}

        {/* Физические сильные стороны */}
        {profile.physicalStrengths && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Физические сильные стороны
            </Text>
            <Box p={3} bg={cardColor} color="black" borderRadius="md">
              <Text fontSize="sm" whiteSpace="pre-wrap">
                {profile.physicalStrengths}
              </Text>
            </Box>
          </Box>
        )}

        {/* Связь тело-психика */}
        {profile.bodyMindConnection && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Связь тело-психика
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.bodyMindConnection}
            </Text>
          </Box>
        )}

        {/* Послания тела */}
        {profile.bodyMessages && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Послания тела
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap" fontStyle="italic">
              {profile.bodyMessages}
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  )
}
