'use client'

/**
 * AutoplayBlockedOverlay — оверлей при блокировке autoplay браузером
 *
 * Два режима:
 * - Аудио заблокировано: чип "Нажмите для звука" в верхнем левом углу
 * - Видео+аудио заблокировано (iOS Safari): большая кнопка play по центру
 */

import { Box, HStack, Icon, Text } from '@chakra-ui/react'
import { LuPlay, LuVolumeX } from 'react-icons/lu'

export interface AutoplayBlockedOverlayProps {
  /** Аудио заблокировано browser autoplay policy */
  isAudioBlocked: boolean
  /** Видео заблокировано browser autoplay policy (iOS Safari) */
  isVideoBlocked: boolean
  /** Разблокировка аудио (клик по чипу) */
  onUnblockAudio: () => void
  /** Разблокировка видео+аудио (клик по оверлею) */
  onUnblockAll: () => void
}

/**
 * Оверлей блокировки autoplay
 *
 * YouTube-стиль чип при блокировке аудио, полноэкранный оверлей при блокировке видео.
 */
export function AutoplayBlockedOverlay({
  isAudioBlocked,
  isVideoBlocked,
  onUnblockAudio,
  onUnblockAll,
}: AutoplayBlockedOverlayProps) {
  // Видео заблокировано → большая кнопка play по центру
  if (isVideoBlocked) {
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
        bg="blackAlpha.600"
        zIndex={4}
        cursor="pointer"
        onClick={onUnblockAll}
      >
        <Box
          bg="blackAlpha.700"
          borderRadius="full"
          p={6}
          transition="transform 0.2s"
          _hover={{ transform: 'scale(1.1)' }}
        >
          <Icon asChild boxSize={16} color="white">
            <LuPlay />
          </Icon>
        </Box>
      </Box>
    )
  }

  // Аудио заблокировано → чип "Нажмите для звука"
  if (isAudioBlocked) {
    return (
      <Box position="absolute" top="80px" left={4} zIndex={6} cursor="pointer" onClick={onUnblockAudio}>
        <HStack
          bg="blackAlpha.700"
          backdropFilter="blur(8px)"
          border="1px solid"
          borderColor="whiteAlpha.200"
          borderRadius="full"
          px={4}
          py={2}
          gap={2}
          transition="background 0.2s"
          _hover={{ bg: 'blackAlpha.800' }}
        >
          <Icon asChild boxSize={4} color="white">
            <LuVolumeX />
          </Icon>
          <Text fontSize="sm" color="white" fontWeight="medium">
            Нажмите для звука
          </Text>
        </HStack>
      </Box>
    )
  }

  return null
}
