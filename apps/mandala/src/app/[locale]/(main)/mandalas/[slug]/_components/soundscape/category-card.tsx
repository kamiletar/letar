'use client'

import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { memo } from 'react'
import type { MeditationTrackCategory } from '../../_schemas/viewer-settings.schema'

const MotionBox = motion.create(Box)

/** Данные категории */
export interface CategoryData {
  id: MeditationTrackCategory | 'custom'
  name: string
  icon: React.ElementType
  gradient: string
  description: string
}

interface CategoryCardProps {
  category: CategoryData
  isSelected: boolean
  onClick: () => void
  tracksCount: number
}

/**
 * Карточка категории треков.
 * Мемоизирована для предотвращения ререндеров при изменении других категорий.
 */
export const CategoryCard = memo(function CategoryCard({
  category,
  isSelected,
  onClick,
  tracksCount,
}: CategoryCardProps) {
  const Icon = category.icon

  return (
    <MotionBox whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} cursor="pointer" onClick={onClick}>
      <Box
        bgGradient={category.gradient}
        borderRadius="xl"
        p={4}
        h="120px"
        position="relative"
        overflow="hidden"
        border="2px solid"
        borderColor={isSelected ? 'white' : 'transparent'}
        transition="border-color 0.2s"
        _hover={{ borderColor: 'whiteAlpha.500' }}
      >
        {/* Декоративный круг */}
        <Box
          position="absolute"
          right={-4}
          bottom={-4}
          width="80px"
          height="80px"
          borderRadius="full"
          bg="whiteAlpha.100"
        />

        <VStack align="flex-start" h="100%" justify="space-between">
          <HStack>
            <Box color="white" opacity={0.9}>
              <Icon size={24} />
            </Box>
            <Heading size="sm" color="white">
              {category.name}
            </Heading>
          </HStack>

          <VStack align="flex-start" gap={0}>
            <Text fontSize="xs" color="whiteAlpha.700">
              {category.description}
            </Text>
            <Text fontSize="xs" color="whiteAlpha.500">
              {tracksCount} {tracksCount === 1 ? 'трек' : tracksCount < 5 ? 'трека' : 'треков'}
            </Text>
          </VStack>
        </VStack>
      </Box>
    </MotionBox>
  )
})
