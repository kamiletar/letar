'use client'

/**
 * PlayerLoadingOverlay — оверлей загрузки видео
 */

import { Box, Spinner } from '@chakra-ui/react'

export interface PlayerLoadingOverlayProps {
  /** Показывать оверлей */
  isLoading: boolean
}

/**
 * Оверлей загрузки видео (спиннер по центру)
 */
export function PlayerLoadingOverlay({ isLoading }: PlayerLoadingOverlayProps) {
  if (!isLoading) {
    return null
  }

  return (
    <Box
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="blackAlpha.700"
      pointerEvents="none"
      zIndex={3}
    >
      <Spinner size="xl" color="white" />
    </Box>
  )
}
