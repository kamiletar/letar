'use client'

import { Box } from '@chakra-ui/react'

import { HEADER_HEIGHT, scrollbarStyles } from '@/lib/constants'

import { HomeLink } from './home-link'
import { SidebarNav } from './sidebar-nav'

/**
 * Боковая панель навигации.
 * Содержит ссылку на главную и все разделы документов.
 */
export function Sidebar() {
  return (
    <Box
      as="nav"
      aria-label="Основная навигация"
      w="240px"
      h={`calc(100vh - ${HEADER_HEIGHT})`}
      position="sticky"
      top={HEADER_HEIGHT}
      overflowY="auto"
      py={4}
      px={3}
      borderRightWidth="1px"
      borderRightColor="border"
      bg="bg.panel"
      display={{ base: 'none', lg: 'block' }}
      css={scrollbarStyles}
    >
      <HomeLink />
      <SidebarNav />
    </Box>
  )
}
