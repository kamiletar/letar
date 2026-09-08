'use client'

/**
 * SubtitleTrackSelector — выбор дорожки субтитров (внешние файлы + встроенные в MKV).
 *
 * Кастомный dropdown (position: absolute), не Chakra `Menu` — `Menu.Positioner` ломается
 * в fullscreen-контейнере плеера, тот же паттерн уже используется в `SpeedSelector`
 * (`@letar/video-player-react`).
 */

import { Box, HStack, IconButton, Text } from '@chakra-ui/react'
import { Tooltip } from '@letar/video-player-react'
import { useCallback, useState } from 'react'
import { LuCaptions, LuCheck } from 'react-icons/lu'

export interface SubtitleTrackOption {
  id: string
  label: string
}

export interface SubtitleTrackSelectorProps {
  /** Первый элемент — обычно «Выключены», дальше внешние дорожки, затем встроенные */
  options: SubtitleTrackOption[]
  selectedId: string
  onSelect: (id: string) => void
}

export function SubtitleTrackSelector({ options, selectedId, onSelect }: SubtitleTrackSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id)
      setIsOpen(false)
    },
    [onSelect],
  )

  // Нечего выбирать (нет ни внешних, ни встроенных дорожек) — кнопка не показывается вовсе
  if (options.length <= 1) {
    return null
  }

  const isActive = selectedId !== 'off'

  return (
    <Box position="relative">
      <Tooltip content="Субтитры">
        <IconButton
          aria-label="Субтитры"
          variant="ghost"
          colorPalette="whiteAlpha"
          size="sm"
          onClick={toggle}
        >
          <LuCaptions
            size={20}
            color={isActive ? 'var(--chakra-colors-player-chapter)' : 'var(--chakra-colors-player-control)'}
          />
        </IconButton>
      </Tooltip>

      {isOpen && <Box position="fixed" inset={0} zIndex={19} onClick={() => setIsOpen(false)} />}

      {isOpen && (
        <Box
          position="absolute"
          bottom="100%"
          right={0}
          mb={2}
          bg="gray.900"
          border="1px solid"
          borderColor="gray.700"
          borderRadius="md"
          py={1}
          minW="220px"
          maxH="60vh"
          overflowY="auto"
          zIndex={20}
        >
          {options.map((option) => (
            <Box
              key={option.id}
              px={3}
              py={1.5}
              cursor="pointer"
              bg={selectedId === option.id ? 'whiteAlpha.100' : 'transparent'}
              color={selectedId === option.id ? 'purple.300' : 'white'}
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => handleSelect(option.id)}
            >
              <HStack justify="space-between" w="full" gap={3}>
                <Text fontSize="sm" truncate>{option.label}</Text>
                {selectedId === option.id && <LuCheck size={14} />}
              </HStack>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
