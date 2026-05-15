'use client'

import { Box, Text, VStack } from '@chakra-ui/react'
import { motion } from 'framer-motion'
import { memo, type ReactNode } from 'react'
import { AnimatedCounter } from '../motion'

interface StatCardProps {
  value: string | number
  label: string
  icon?: ReactNode
  /** Индекс для stagger-анимации */
  index?: number
}

/**
 * Карточка статистики с анимированным счётчиком
 * Мемоизирована для предотвращения лишних перерендеров в SimpleGrid
 */
export const StatCard = memo(function StatCard({ value, label, icon, index = 0 }: StatCardProps) {
  // Парсим числовое значение для анимации
  const numericValue = typeof value === 'number' ? value : parseInt(value.toString(), 10)
  const suffix = typeof value === 'string' ? value.replace(/\d+/, '') : ''
  const isNumeric = !isNaN(numericValue)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{
        duration: 0.5,
        delay: index * 0.1,
        ease: 'easeOut',
      }}
    >
      <VStack
        p={6}
        borderRadius="lg"
        bg={{ base: 'gray.50', _dark: 'gray.800' }}
        border="1px solid"
        borderColor={{ base: 'gray.200', _dark: 'gray.700' }}
        gap={2}
        textAlign="center"
        _hover={{
          borderColor: 'fg.500',
          transform: 'translateY(-4px)',
          boxShadow: 'lg',
        }}
        transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
      >
        {icon && (
          <Box color="fg.500" fontSize="2xl">
            {icon}
          </Box>
        )}
        <Text fontSize={{ base: '3xl', md: '4xl' }} fontWeight="bold" color="fg.500" fontFamily="mono">
          {isNumeric ? <AnimatedCounter value={numericValue} suffix={suffix} duration={1.5} /> : value}
        </Text>
        <Text fontSize="sm" color="fg.subtle">
          {label}
        </Text>
      </VStack>
    </motion.div>
  )
})
