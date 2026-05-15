import type { Gender } from '@/generated/prisma'
import { getSession } from '@/lib/auth'
import { getEnhancedPrisma } from '@/lib/db'
import { Badge, Box, Grid, HStack, Text, VStack } from '@chakra-ui/react'

interface SizeRecommendationProps {
  measurements: {
    gender: Gender
    bust: number | null
    waist: number | null
    hips: number | null
  }
}

/**
 * Компонент для отображения рекомендованного размера на основе замеров пользователя.
 * Server Component - делает запрос к БД для получения размеров.
 */
export async function SizeRecommendation({ measurements }: SizeRecommendationProps) {
  const session = await getSession()
  if (!session?.user) {
    return null
  }

  const db = getEnhancedPrisma(session.user)

  // Находим все размеры для данного пола
  const allSizes = await db.productSize.findMany({
    where: {
      gender: measurements.gender,
    },
    orderBy: {
      sortOrder: 'asc',
    },
  })

  if (allSizes.length === 0) {
    return <Text color="fg.muted">Размеры для вашего пола пока не добавлены в каталог</Text>
  }

  // Функция проверки, попадает ли замер в диапазон
  const isInRange = (value: number | null, min: number, max: number) => {
    if (value === null) {
      return true
    } // Если замер не указан, считаем что подходит
    return value >= min && value <= max
  }

  // Находим размеры, которые подходят по всем указанным замерам
  const matchingSizes = allSizes.filter((size: (typeof allSizes)[number]) => {
    const bustMatch = isInRange(measurements.bust, size.bustMin, size.bustMax)
    const waistMatch = isInRange(measurements.waist, size.waistMin, size.waistMax)
    const hipsMatch = isInRange(measurements.hips, size.hipsMin, size.hipsMax)

    return bustMatch && waistMatch && hipsMatch
  })

  // Если нет полных совпадений, находим частичные (по 2 из 3 параметров)
  const partialMatches =
    matchingSizes.length === 0
      ? allSizes.filter((size: (typeof allSizes)[number]) => {
          const bustMatch = isInRange(measurements.bust, size.bustMin, size.bustMax)
          const waistMatch = isInRange(measurements.waist, size.waistMin, size.waistMax)
          const hipsMatch = isInRange(measurements.hips, size.hipsMin, size.hipsMax)

          const matches = [bustMatch, waistMatch, hipsMatch].filter(Boolean).length
          return matches >= 2
        })
      : []

  if (matchingSizes.length === 0 && partialMatches.length === 0) {
    return (
      <VStack align="start" gap={3}>
        <Text color="fg.muted">
          К сожалению, не удалось найти точное совпадение по вашим замерам. Рекомендуем обратиться к консультанту для
          индивидуального подбора.
        </Text>
        <Text fontSize="sm" color="fg.muted">
          💡 Совет: проверьте правильность введенных измерений
        </Text>
      </VStack>
    )
  }

  const recommendedSizes = matchingSizes.length > 0 ? matchingSizes : partialMatches
  const isPartial = matchingSizes.length === 0

  return (
    <VStack align="start" gap={4}>
      {isPartial && (
        <Badge colorPalette="yellow" variant="subtle" fontSize="sm">
          Частичное совпадение
        </Badge>
      )}

      <Text fontWeight="medium">
        {isPartial
          ? 'На основе ваших замеров подходят следующие размеры (частичное совпадение):'
          : 'На основе ваших замеров вам подходят следующие размеры:'}
      </Text>

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4} w="full">
        {recommendedSizes.map((size: (typeof recommendedSizes)[number]) => (
          <Box
            key={size.id}
            p={4}
            borderWidth="1px"
            borderRadius="md"
            borderColor={isPartial ? 'yellow.200' : 'green.200'}
            bg={isPartial ? 'yellow.50' : 'green.50'}
          >
            <VStack align="start" gap={2}>
              <HStack justify="space-between" w="full">
                <Text fontWeight="bold" fontSize="lg">
                  RU {size.ru}
                </Text>
                <Badge colorPalette={isPartial ? 'yellow' : 'green'}>{size.international}</Badge>
              </HStack>

              <Text fontSize="sm" color="fg.muted">
                DE {size.de} • IT {size.it} • FR {size.fr}
              </Text>
              <Text fontSize="sm" color="fg.muted">
                UK {size.uk} • US {size.us}
              </Text>

              {/* Показываем диапазоны измерений */}
              <Box pt={2} fontSize="xs" color="fg.muted">
                <Text>
                  Грудь: {size.bustMin}-{size.bustMax} см
                </Text>
                <Text>
                  Талия: {size.waistMin}-{size.waistMax} см
                </Text>
                <Text>
                  Бедра: {size.hipsMin}-{size.hipsMax} см
                </Text>
              </Box>
            </VStack>
          </Box>
        ))}
      </Grid>

      {isPartial && (
        <Text fontSize="sm" color="fg.muted">
          💡 Для более точной рекомендации заполните все измерения (грудь, талия, бедра)
        </Text>
      )}
    </VStack>
  )
}
