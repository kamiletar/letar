/* oxlint-disable no-array-index-key */
import { Box, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuSparkles } from 'react-icons/lu'

type NumerologyProfile = {
  lifePathNumber?: number | null
  destinyNumber?: number | null
  soulNumber?: number | null
  personalityNumber?: number | null
  maturityNumber?: number | null
  currentCycle?: string | null
  cycleDescription?: string | null
  talents?: string | null
  gifts?: string | null
  purpose?: string | null
  karmicLessons?: string | null
  karmicDebts?: string | null
  matrixData?: string | null
  notes?: string | null
} | null

interface NumerologyProfileCardProps {
  profile: NumerologyProfile
}

/**
 * Карточка нумерологического профиля для клиента
 * Read-only отображение матрицы судьбы и нумерологических данных
 */
export function NumerologyProfileCard({ profile }: NumerologyProfileCardProps) {
  const cardColor = '#FF6B6B' // Коралловый

  if (!profile) {
    return (
      <Box p={6} borderWidth="2px" borderColor={cardColor} borderRadius="lg" opacity={0.6}>
        <VStack gap={3} alignItems="center">
          <LuSparkles size={32} color={cardColor} />
          <Text fontSize="lg" fontWeight="medium">
            Нумерология
          </Text>
          <Text color="fg.muted" textAlign="center">
            Профиль еще не заполнен
          </Text>
        </VStack>
      </Box>
    )
  }

  // Парсинг данных (поддержка JSON массивов и строк с разделителями)
  let talents: string[] = []
  let gifts: string[] = []
  let karmicLessons: string[] = []

  try {
    if (profile.talents) {
      try {
        talents = JSON.parse(profile.talents)
      } catch {
        // Если не JSON, то это строка с разделителями - разбиваем по запятым
        talents = profile.talents.split(',').map((t) => t.trim())
      }
    }
    if (profile.gifts) {
      try {
        gifts = JSON.parse(profile.gifts)
      } catch {
        gifts = profile.gifts.split(',').map((g) => g.trim())
      }
    }
    if (profile.karmicLessons) {
      try {
        karmicLessons = JSON.parse(profile.karmicLessons)
      } catch {
        karmicLessons = profile.karmicLessons.split(',').map((k) => k.trim())
      }
    }
  } catch (error) {
    console.error('Ошибка обработки данных профиля:', error)
  }

  return (
    <Box p={6} borderWidth="2px" borderColor={cardColor} borderRadius="lg" bg={`${cardColor}08`}>
      <VStack gap={4} align="stretch">
        {/* Заголовок */}
        <Box display="flex" alignItems="center" gap={2}>
          <LuSparkles size={24} color={cardColor} />
          <Text fontSize="xl" fontWeight="bold" color={cardColor}>
            Нумерология
          </Text>
        </Box>

        {/* Числа матрицы судьбы */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
            Матрица судьбы
          </Text>
          <SimpleGrid columns={3} gap={3}>
            {profile.lifePathNumber && (
              <Box p={3} bg={cardColor} color="white" borderRadius="md" textAlign="center">
                <Text fontSize="2xl" fontWeight="bold">
                  {profile.lifePathNumber}
                </Text>
                <Text fontSize="xs">Путь жизни</Text>
              </Box>
            )}
            {profile.destinyNumber && (
              <Box p={3} bg={cardColor} color="white" borderRadius="md" textAlign="center">
                <Text fontSize="2xl" fontWeight="bold">
                  {profile.destinyNumber}
                </Text>
                <Text fontSize="xs">Судьба</Text>
              </Box>
            )}
            {profile.soulNumber && (
              <Box p={3} bg={cardColor} color="white" borderRadius="md" textAlign="center">
                <Text fontSize="2xl" fontWeight="bold">
                  {profile.soulNumber}
                </Text>
                <Text fontSize="xs">Душа</Text>
              </Box>
            )}
            {profile.personalityNumber && (
              <Box p={3} bg={cardColor} color="white" borderRadius="md" textAlign="center">
                <Text fontSize="2xl" fontWeight="bold">
                  {profile.personalityNumber}
                </Text>
                <Text fontSize="xs">Личность</Text>
              </Box>
            )}
            {profile.maturityNumber && (
              <Box p={3} bg={cardColor} color="white" borderRadius="md" textAlign="center">
                <Text fontSize="2xl" fontWeight="bold">
                  {profile.maturityNumber}
                </Text>
                <Text fontSize="xs">Зрелость</Text>
              </Box>
            )}
          </SimpleGrid>
        </Box>

        {/* Текущий цикл */}
        {profile.currentCycle && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Текущий жизненный цикл
            </Text>
            <Text fontWeight="medium">{profile.currentCycle}</Text>
            {profile.cycleDescription && (
              <Text fontSize="sm" color="fg.muted" mt={1}>
                {profile.cycleDescription}
              </Text>
            )}
          </Box>
        )}

        {/* Таланты */}
        {talents.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
              Таланты
            </Text>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {/* oxlint-disable-next-line no-array-index-key */}
              {talents.map((talent, index) => (
                <Box key={index} px={3} py={1} bg="bg.muted" borderRadius="full" fontSize="sm">
                  {talent}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Дары */}
        {gifts.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
              Дары
            </Text>
            <Box display="flex" flexWrap="wrap" gap={2}>
              {/* oxlint-disable-next-line no-array-index-key */}
              {gifts.map((gift, index) => (
                <Box key={index} px={3} py={1} bg="bg.muted" borderRadius="full" fontSize="sm">
                  {gift}
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Предназначение */}
        {profile.purpose && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Предназначение
            </Text>
            <Text whiteSpace="pre-wrap">{profile.purpose}</Text>
          </Box>
        )}

        {/* Кармические уроки */}
        {karmicLessons.length > 0 && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={2} color="fg.muted">
              Кармические уроки
            </Text>
            <VStack gap={1} align="stretch">
              {/* oxlint-disable-next-line no-array-index-key */}
              {karmicLessons.map((lesson, index) => (
                <Text key={index} fontSize="sm">
                  • {lesson}
                </Text>
              ))}
            </VStack>
          </Box>
        )}

        {/* Кармические долги */}
        {profile.karmicDebts && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Кармические долги
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.karmicDebts}
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  )
}
