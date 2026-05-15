import { Box, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuUser } from 'react-icons/lu'

type StyleProfile = {
  colorType?: string | null
  colorPalette?: string | null
  colorRecommendations?: string | null
  primaryArchetype?: string | null
  secondaryArchetype?: string | null
  archetypeDescription?: string | null
  selfExpression?: string | null
  authenticityLevel?: number | null
  innerOuterAlignment?: string | null
  styleConflicts?: string | null
  styleRecommendations?: string | null
  notes?: string | null
} | null

interface StyleProfileCardProps {
  profile: StyleProfile
}

// Названия цветотипов
const colorTypeNames: Record<string, string> = {
  SPRING: 'Весна',
  SUMMER: 'Лето',
  AUTUMN: 'Осень',
  WINTER: 'Зима',
}

// Названия архетипов
const archetypeNames: Record<string, string> = {
  INNOCENT: 'Невинный',
  EVERYMAN: 'Обычный человек',
  HERO: 'Герой',
  OUTLAW: 'Бунтарь',
  EXPLORER: 'Искатель',
  CREATOR: 'Творец',
  RULER: 'Правитель',
  MAGICIAN: 'Маг',
  LOVER: 'Любовник',
  CAREGIVER: 'Заботливый',
  JESTER: 'Шут',
  SAGE: 'Мудрец',
}

/**
 * Карточка стилевого профиля для клиента
 * Read-only отображение цветотипа, архетипа и самовыражения
 */
export function StyleProfileCard({ profile }: StyleProfileCardProps) {
  const cardColor = '#F38181' // Персиковый

  if (!profile) {
    return (
      <Box p={6} borderWidth="2px" borderColor={cardColor} borderRadius="lg" opacity={0.6}>
        <VStack gap={3} alignItems="center">
          <LuUser size={32} color={cardColor} />
          <Text fontSize="lg" fontWeight="medium">
            Стиль
          </Text>
          <Text color="fg.muted" textAlign="center">
            Профиль еще не заполнен
          </Text>
        </VStack>
      </Box>
    )
  }

  // Функция для получения цвета индикатора аутентичности
  const getAuthenticityColor = (level: number) => {
    if (level >= 8) {
      return '#00A878'
    } // Зеленый
    if (level >= 5) {
      return '#F7B801'
    } // Желтый
    return '#C41E3A' // Красный
  }

  return (
    <Box p={6} borderWidth="2px" borderColor={cardColor} borderRadius="lg" bg={`${cardColor}08`}>
      <VStack gap={4} align="stretch">
        {/* Заголовок */}
        <Box display="flex" alignItems="center" gap={2}>
          <LuUser size={24} color={cardColor} />
          <Text fontSize="xl" fontWeight="bold" color={cardColor}>
            Стиль
          </Text>
        </Box>

        {/* Цветотип и архетипы */}
        <SimpleGrid columns={1} gap={3}>
          {profile.colorType && (
            <Box p={4} bg={cardColor} color="white" borderRadius="md">
              <Text fontSize="sm" opacity={0.9} mb={1}>
                Цветотип
              </Text>
              <Text fontSize="xl" fontWeight="bold">
                {colorTypeNames[profile.colorType] || profile.colorType}
              </Text>
            </Box>
          )}

          {profile.primaryArchetype && (
            <Box p={4} bg="bg.muted" borderRadius="md">
              <Text fontSize="sm" color="fg.muted" mb={1}>
                Основной архетип
              </Text>
              <Text fontSize="lg" fontWeight="bold">
                {archetypeNames[profile.primaryArchetype] || profile.primaryArchetype}
              </Text>
            </Box>
          )}

          {profile.secondaryArchetype && (
            <Box p={4} bg="bg.muted" borderRadius="md">
              <Text fontSize="sm" color="fg.muted" mb={1}>
                Дополнительный архетип
              </Text>
              <Text fontSize="lg" fontWeight="medium">
                {archetypeNames[profile.secondaryArchetype] || profile.secondaryArchetype}
              </Text>
            </Box>
          )}
        </SimpleGrid>

        {/* Описание архетипа */}
        {profile.archetypeDescription && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Описание архетипа
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.archetypeDescription}
            </Text>
          </Box>
        )}

        {/* Рекомендации по цветам */}
        {profile.colorRecommendations && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Рекомендации по цветам
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.colorRecommendations}
            </Text>
          </Box>
        )}

        {/* Самовыражение */}
        {profile.selfExpression && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Самовыражение
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.selfExpression}
            </Text>
          </Box>
        )}

        {/* Уровень аутентичности */}
        {profile.authenticityLevel !== null && profile.authenticityLevel !== undefined && (
          <Box>
            <Box display="flex" justifyContent="space-between" mb={2}>
              <Text fontSize="sm" fontWeight="medium" color="fg.muted">
                Уровень аутентичности
              </Text>
              <Text fontSize="lg" fontWeight="bold" color={getAuthenticityColor(profile.authenticityLevel)}>
                {profile.authenticityLevel}/10
              </Text>
            </Box>
            <Box h="12px" bg="bg.muted" borderRadius="full" overflow="hidden">
              <Box h="100%" w={`${(profile.authenticityLevel / 10) * 100}%`} bg={cardColor} transition="width 0.3s" />
            </Box>
          </Box>
        )}

        {/* Соответствие внутреннего и внешнего */}
        {profile.innerOuterAlignment && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Соответствие внутреннего и внешнего
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.innerOuterAlignment}
            </Text>
          </Box>
        )}

        {/* Конфликты в стиле */}
        {profile.styleConflicts && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Конфликты в стиле
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.styleConflicts}
            </Text>
          </Box>
        )}

        {/* Рекомендации по стилю */}
        {profile.styleRecommendations && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Рекомендации по стилю
            </Text>
            <Box p={3} bg={cardColor} color="white" borderRadius="md">
              <Text fontSize="sm" whiteSpace="pre-wrap">
                {profile.styleRecommendations}
              </Text>
            </Box>
          </Box>
        )}
      </VStack>
    </Box>
  )
}
