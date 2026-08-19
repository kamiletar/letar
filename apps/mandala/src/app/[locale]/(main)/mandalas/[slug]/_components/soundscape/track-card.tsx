'use client'

import { Box, HStack, Text } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { memo } from 'react'
import { LuMusic, LuSparkles } from 'react-icons/lu'

const MotionBox = motion.create(Box)

interface TrackCardProps {
  name: string
  isSelected: boolean
  onClick: () => void
  isPreviewPlaying?: boolean
}

/**
 * Карточка трека.
 * Мемоизирована для предотвращения ререндеров при изменении других треков.
 */
export const TrackCard = memo(function TrackCard({ name, isSelected, onClick, isPreviewPlaying }: TrackCardProps) {
  return (
    <MotionBox whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} cursor="pointer" onClick={onClick}>
      <Box
        bg={isSelected ? 'purple.600' : 'whiteAlpha.100'}
        borderRadius="lg"
        p={3}
        border="1px solid"
        borderColor={isSelected ? 'purple.400' : 'whiteAlpha.200'}
        transitionProperty="background-color, border-color"
        transitionDuration="0.2s"
        _hover={{ bg: isSelected ? 'purple.600' : 'whiteAlpha.200' }}
      >
        <HStack justify="space-between">
          <HStack gap={3}>
            <Box
              color={isSelected ? 'white' : 'purple.400'}
              bg={isSelected ? 'whiteAlpha.200' : 'purple.900'}
              p={2}
              borderRadius="md"
            >
              <LuMusic size={16} />
            </Box>
            <Text fontSize="sm" fontWeight={isSelected ? 'semibold' : 'normal'} color="white">
              {name}
            </Text>
          </HStack>

          {isPreviewPlaying && (
            <Box color="purple.300">
              <LuSparkles size={16} />
            </Box>
          )}
        </HStack>
      </Box>
    </MotionBox>
  )
})
