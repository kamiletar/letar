'use client'

/**
 * Экран чтения одного стихотворения: тёмный фон на весь экран, крупный текст, листание.
 */

import type { DisplayPoem } from '@/lib/offline/poems-store'
import { Box, Button, Flex, Heading, HStack, IconButton, Text } from '@chakra-ui/react'
import { useRef } from 'react'
import { LuChevronLeft, LuChevronRight, LuMaximize, LuMinimize, LuMinus, LuPencil, LuPlus, LuX } from 'react-icons/lu'

/** Минимальный сдвиг пальца по горизонтали, который считается листанием, px */
const SWIPE_THRESHOLD = 70

interface PoemReadingViewProps {
  poem: DisplayPoem
  /** Номер стихотворения в списке, с 0 */
  index: number
  total: number
  fontSize: number
  fullscreenSupported: boolean
  isFullscreen: boolean
  onClose: () => void
  onGoTo: (index: number) => void
  onFontChange: (delta: number) => void
  onToggleFullscreen: () => void
  onEdit: () => void
  /** Конфликт с сайтом: оставить свою правку */
  onKeepMine: () => void
  /** Конфликт с сайтом: взять версию с сайта */
  onTakeServer: () => void
}

export function PoemReadingView({
  poem,
  index,
  total,
  fontSize,
  fullscreenSupported,
  isFullscreen,
  onClose,
  onGoTo,
  onFontChange,
  onToggleFullscreen,
  onEdit,
  onKeepMine,
  onTakeServer,
}: PoemReadingViewProps) {
  const touchStartX = useRef<number | null>(null)

  return (
    <Flex
      direction="column"
      position="fixed"
      inset={0}
      zIndex={10000}
      bg="#0b0b0b"
      color="#f3f3f3"
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null
      }}
      onTouchEnd={(event) => {
        const start = touchStartX.current
        touchStartX.current = null
        const end = event.changedTouches[0]?.clientX
        if (start === null || end === undefined) {
          return
        }
        const delta = end - start
        if (delta <= -SWIPE_THRESHOLD) {
          onGoTo(index + 1)
        } else if (delta >= SWIPE_THRESHOLD) {
          onGoTo(index - 1)
        }
      }}
    >
      {/* Верхняя панель */}
      <HStack
        gap={1}
        px={2}
        py={2}
        borderBottomWidth="1px"
        borderColor="whiteAlpha.200"
        flexShrink={0}
        pt="max(8px, env(safe-area-inset-top))"
      >
        <IconButton aria-label="К списку стихов" variant="ghost" color="inherit" onClick={onClose}>
          <LuX />
        </IconButton>
        <Text flex={1} minW={0} fontSize="sm" color="whiteAlpha.700" lineClamp={1} textAlign="center">
          {index + 1} из {total}
          {poem.pending && ' · не отправлено'}
        </Text>
        <IconButton aria-label="Править" variant="ghost" color="inherit" onClick={onEdit}>
          <LuPencil />
        </IconButton>
        <IconButton aria-label="Меньше шрифт" variant="ghost" color="inherit" onClick={() => onFontChange(-2)}>
          <LuMinus />
        </IconButton>
        <IconButton aria-label="Больше шрифт" variant="ghost" color="inherit" onClick={() => onFontChange(2)}>
          <LuPlus />
        </IconButton>
        {fullscreenSupported && (
          <IconButton
            aria-label={isFullscreen ? 'Выйти из полного экрана' : 'На весь экран'}
            variant="ghost"
            color="inherit"
            onClick={onToggleFullscreen}
          >
            {isFullscreen ? <LuMinimize /> : <LuMaximize />}
          </IconButton>
        )}
      </HStack>

      {/* Конфликт: стих на сайте изменили после того, как его правили здесь */}
      {poem.conflict && (
        <Box px={4} py={3} bg="#3a2a00" borderBottomWidth="1px" borderColor="whiteAlpha.200" flexShrink={0}>
          <Text fontSize="sm" mb={2}>
            На сайте этот стих изменили, пока вы правили его здесь. Показана ваша версия.
          </Text>
          <HStack gap={2}>
            <Button size="sm" colorPalette="orange" onClick={onKeepMine}>Оставить мою</Button>
            <Button size="sm" variant="outline" color="inherit" borderColor="whiteAlpha.400" onClick={onTakeServer}>
              Взять с сайта
            </Button>
          </HStack>
        </Box>
      )}

      {/* Текст стихотворения */}
      <Box flex={1} overflowY="auto" px={{ base: 5, md: 10 }} py={6}>
        <Box maxW="820px" mx="auto">
          <Heading asChild fontSize={`${Math.round(fontSize * 1.15)}px`} lineHeight="short" mb={6} color="#ffffff">
            <h1>{poem.title}</h1>
          </Heading>
          <Text fontSize={`${fontSize}px`} lineHeight="1.55" whiteSpace="pre-wrap" wordBreak="break-word">
            {poem.text}
          </Text>
        </Box>
      </Box>

      {/* Нижняя панель: предыдущее и следующее */}
      <HStack
        gap={2}
        px={3}
        py={2}
        borderTopWidth="1px"
        borderColor="whiteAlpha.200"
        flexShrink={0}
        pb="max(8px, env(safe-area-inset-bottom))"
      >
        <Button
          flex={1}
          variant="outline"
          color="inherit"
          borderColor="whiteAlpha.300"
          size="lg"
          disabled={index <= 0}
          onClick={() => onGoTo(index - 1)}
        >
          <LuChevronLeft />
          Назад
        </Button>
        <Button
          flex={1}
          variant="outline"
          color="inherit"
          borderColor="whiteAlpha.300"
          size="lg"
          disabled={index >= total - 1}
          onClick={() => onGoTo(index + 1)}
        >
          Дальше
          <LuChevronRight />
        </Button>
      </HStack>
    </Flex>
  )
}
