'use client'

import { GLOW } from '@/lib/utils/constants'
import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { memo, type ReactNode } from 'react'

interface FeatureCardProps {
  title: string
  description: string
  icon: ReactNode
  /** Индекс для stagger-анимации */
  index?: number
}

/**
 * Карточка функции с анимацией появления
 * Мемоизирована для предотвращения лишних перерендеров в SimpleGrid
 */
export const FeatureCard = memo(function FeatureCard({ title, description, icon, index = 0 }: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay: index * 0.15,
        ease: 'easeOut',
      }}
      whileHover={{ y: -4 }}
      style={{ opacity: 1 }}
    >
      <VStack
        p={6}
        borderRadius="lg"
        bg="bg.panel"
        border="1px solid"
        borderColor="border.subtle"
        gap={4}
        align="start"
        height="full"
        color="fg"
        _hover={{
          borderColor: 'fg.500',
          boxShadow: GLOW.cardShadow,
        }}
        transitionProperty="border-color, box-shadow"
        transitionDuration="0.3s"
        transitionTimingFunction="cubic-bezier(0.4, 0, 0.2, 1)"
      >
        <Box p={3} borderRadius="md" bg={{ base: 'fg.50', _dark: 'fg.900' }} color="fg.500">
          {icon}
        </Box>
        <Heading as="h3" size="md" color="fg">
          {title}
        </Heading>
        <Text color="fg.muted" fontSize="sm">
          {description}
        </Text>
      </VStack>
    </motion.div>
  )
})
