'use client'

import { Box, VStack } from '@chakra-ui/react'
import { memo } from 'react'

import { navData } from './nav-data'
import { NavSection } from './nav-section'

interface SidebarNavProps {
  /** Callback при клике на элемент (для закрытия мобильного меню) */
  onItemClick?: () => void
}

/**
 * Навигационный контент sidebar.
 * Переиспользуется в desktop и mobile версиях.
 * Мемоизирован для оптимизации ререндеров.
 */
export const SidebarNav = memo(function SidebarNav({ onItemClick }: SidebarNavProps) {
  return (
    <VStack align="stretch" gap={0}>
      {navData.map((section) => (
        <Box key={section.title} onClick={onItemClick}>
          <NavSection title={section.title} items={section.items} />
        </Box>
      ))}
    </VStack>
  )
})
