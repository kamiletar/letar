import { Box, HStack, Text, VStack } from '@chakra-ui/react'
import { LuStar } from 'react-icons/lu'

export interface RatingDistributionProps {
  /**
   * Количество отзывов на каждую оценку — ключ 1-5, значение может отсутствовать (трактуется как 0)
   */
  distribution: Partial<Record<1 | 2 | 3 | 4 | 5, number>>
  /**
   * Общее число отзывов (для процентов). Если не передано — считается суммой `distribution`
   */
  total?: number
}

/**
 * Распределение оценок 5→1 звёзд горизонтальными барами с количеством отзывов на каждую.
 *
 * @example
 * ```tsx
 * <RatingDistribution distribution={{ 5: 12, 4: 3, 3: 1 }} />
 * ```
 */
export function RatingDistribution({ distribution, total }: RatingDistributionProps) {
  const totalCount = total ?? Object.values(distribution).reduce((sum, count) => sum + (count ?? 0), 0)

  if (totalCount === 0) {
    return null
  }

  return (
    <VStack align="stretch" gap={1.5} w="full">
      {([5, 4, 3, 2, 1] as const).map((star) => {
        const count = distribution[star] ?? 0
        const percent = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0
        return (
          <HStack key={star} gap={2}>
            <HStack gap={0.5} minW="10" flexShrink={0} color="fg.muted">
              <Text fontSize="xs">{star}</Text>
              <LuStar size={11} fill="currentColor" />
            </HStack>
            <Box flex={1} h={2} bg="bg.muted" borderRadius="full" overflow="hidden">
              <Box h="full" w={`${percent}%`} bg="yellow.solid" borderRadius="full" />
            </Box>
            <Text fontSize="xs" color="fg.muted" minW="8" textAlign="right" flexShrink={0}>
              {count}
            </Text>
          </HStack>
        )
      })}
    </VStack>
  )
}
