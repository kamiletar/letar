'use client'

/**
 * PlayerHeader — заголовок плеера с названием и кнопкой назад
 *
 * Появляется/скрывается вместе с контролами.
 * Поддерживает слот для правой части (дорожки, настройки).
 */

import { Box, Flex, HStack, IconButton, Text } from '@chakra-ui/react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { LuChevronLeft as BackIcon } from 'react-icons/lu'

export interface PlayerHeaderProps {
  /** Slug аниме (shikimoriId) для ссылки назад */
  animeSlug: string
  /** Название аниме */
  animeName: string
  /** Номер эпизода */
  episodeNumber: number
  /** Название эпизода */
  episodeName?: string
  /** Видимость (контролируется autoHide) */
  visible: boolean
  /** Слот для правой части (дорожки, субтитры, настройки) */
  rightSlot?: ReactNode
}

export function PlayerHeader({
  animeSlug,
  animeName,
  episodeNumber,
  episodeName,
  visible,
  rightSlot,
}: PlayerHeaderProps) {
  return (
    <Flex
      position="absolute"
      top={0}
      left={0}
      right={0}
      align="center"
      justify="space-between"
      px={4}
      py={3}
      bg="linear-gradient(180deg, rgba(0,0,0,0.7) 0%, transparent 100%)"
      opacity={visible ? 1 : 0}
      transition="opacity 0.3s"
      pointerEvents={visible ? 'auto' : 'none'}
      zIndex={10}
    >
      {/* Левая часть: назад + название */}
      <HStack gap={2}>
        <Link href={`/anime/${animeSlug}`}>
          <IconButton aria-label="Назад" size="sm" variant="ghost" color="white" _hover={{ bg: 'whiteAlpha.200' }}>
            <BackIcon />
          </IconButton>
        </Link>

        <Box>
          <Text color="white" fontSize="sm" fontWeight="medium" lineClamp={1}>
            {animeName}
          </Text>
          <Text color="gray.400" fontSize="xs">
            Эпизод {episodeNumber}
            {episodeName && ` — ${episodeName}`}
          </Text>
        </Box>
      </HStack>

      {/* Правая часть: дорожки, субтитры, настройки */}
      {rightSlot && (
        <HStack gap={1} onClick={(e) => e.stopPropagation()}>
          {rightSlot}
        </HStack>
      )}
    </Flex>
  )
}
