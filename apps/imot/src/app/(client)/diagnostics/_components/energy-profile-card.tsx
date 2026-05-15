import { Box, SimpleGrid, Text, VStack } from '@chakra-ui/react'
import { LuActivity } from 'react-icons/lu'

type EnergyProfile = {
  rootChakra?: number | null
  sacralChakra?: number | null
  solarPlexusChakra?: number | null
  heartChakra?: number | null
  throatChakra?: number | null
  thirdEyeChakra?: number | null
  crownChakra?: number | null
  energyBlocks?: string | null
  blockageAreas?: string | null
  moneyChannelLevel?: number | null
  moneyBlockages?: string | null
  relationshipEnergy?: number | null
  relationshipBlocks?: string | null
  vitalityLevel?: number | null
  energyLeaks?: string | null
  notes?: string | null
} | null

interface EnergyProfileCardProps {
  profile: EnergyProfile
}

// Названия и цвета чакр
const chakras = [
  { key: 'rootChakra', name: 'Муладхара', subtitle: 'Корневая', color: '#C41E3A' },
  {
    key: 'sacralChakra',
    name: 'Свадхистхана',
    subtitle: 'Сакральная',
    color: '#FF6B35',
  },
  {
    key: 'solarPlexusChakra',
    name: 'Манипура',
    subtitle: 'Солнечное сплетение',
    color: '#F7B801',
  },
  { key: 'heartChakra', name: 'Анахата', subtitle: 'Сердечная', color: '#00A878' },
  { key: 'throatChakra', name: 'Вишудха', subtitle: 'Горловая', color: '#006BA6' },
  {
    key: 'thirdEyeChakra',
    name: 'Аджна',
    subtitle: 'Третий глаз',
    color: '#5C4B99',
  },
  { key: 'crownChakra', name: 'Сахасрара', subtitle: 'Коронная', color: '#8E44AD' },
]

/**
 * Карточка энергетического профиля для клиента
 * Read-only отображение состояния 7 чакр и энергетических каналов
 */
export function EnergyProfileCard({ profile }: EnergyProfileCardProps) {
  const cardColor = '#FFE66D' // Золотисто-желтый

  if (!profile) {
    return (
      <Box p={6} borderWidth="2px" borderColor={cardColor} borderRadius="lg" opacity={0.6}>
        <VStack gap={3} alignItems="center">
          <LuActivity size={32} color={cardColor} />
          <Text fontSize="lg" fontWeight="medium">
            Энергетика
          </Text>
          <Text color="fg.muted" textAlign="center">
            Профиль еще не заполнен
          </Text>
        </VStack>
      </Box>
    )
  }

  // Функция для получения цвета индикатора по уровню
  const getLevelColor = (level: number) => {
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
          <LuActivity size={24} color={cardColor} />
          <Text fontSize="xl" fontWeight="bold" color={cardColor}>
            Энергетика
          </Text>
        </Box>

        {/* 7 чакр */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={3} color="fg.muted">
            Состояние 7 чакр
          </Text>
          <VStack gap={2} align="stretch">
            {chakras.map((chakra) => {
              const level = profile[chakra.key as keyof typeof profile] as number | null | undefined
              if (!level) {
                return null
              }

              return (
                <Box key={chakra.key}>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Box>
                      <Text fontSize="sm" fontWeight="medium">
                        {chakra.name}
                      </Text>
                      <Text fontSize="xs" color="fg.muted">
                        {chakra.subtitle}
                      </Text>
                    </Box>
                    <Text fontSize="lg" fontWeight="bold" color={getLevelColor(level)}>
                      {level}/10
                    </Text>
                  </Box>
                  <Box h="8px" bg="bg.muted" borderRadius="full" overflow="hidden">
                    <Box h="100%" w={`${(level / 10) * 100}%`} bg={chakra.color} transition="width 0.3s" />
                  </Box>
                </Box>
              )
            })}
          </VStack>
        </Box>

        {/* Энергетические блоки */}
        {profile.blockageAreas && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Области блокировок
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.blockageAreas}
            </Text>
          </Box>
        )}

        {/* Денежный канал, энергия отношений, жизненная сила */}
        <SimpleGrid columns={3} gap={3}>
          {profile.moneyChannelLevel && (
            <Box textAlign="center" p={3} bg="bg.muted" borderRadius="md">
              <Text fontSize="2xl" fontWeight="bold" color={getLevelColor(profile.moneyChannelLevel)}>
                {profile.moneyChannelLevel}/10
              </Text>
              <Text fontSize="xs" color="fg.muted">
                Денежный канал
              </Text>
            </Box>
          )}

          {profile.relationshipEnergy && (
            <Box textAlign="center" p={3} bg="bg.muted" borderRadius="md">
              <Text fontSize="2xl" fontWeight="bold" color={getLevelColor(profile.relationshipEnergy)}>
                {profile.relationshipEnergy}/10
              </Text>
              <Text fontSize="xs" color="fg.muted">
                Энергия отношений
              </Text>
            </Box>
          )}

          {profile.vitalityLevel && (
            <Box textAlign="center" p={3} bg="bg.muted" borderRadius="md">
              <Text fontSize="2xl" fontWeight="bold" color={getLevelColor(profile.vitalityLevel)}>
                {profile.vitalityLevel}/10
              </Text>
              <Text fontSize="xs" color="fg.muted">
                Жизненная сила
              </Text>
            </Box>
          )}
        </SimpleGrid>

        {/* Блоки в денежном канале */}
        {profile.moneyBlockages && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Блоки в денежном канале
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.moneyBlockages}
            </Text>
          </Box>
        )}

        {/* Блоки в отношениях */}
        {profile.relationshipBlocks && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Блоки в отношениях
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.relationshipBlocks}
            </Text>
          </Box>
        )}

        {/* Утечки энергии */}
        {profile.energyLeaks && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1} color="fg.muted">
              Утечки энергии
            </Text>
            <Text fontSize="sm" whiteSpace="pre-wrap">
              {profile.energyLeaks}
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  )
}
