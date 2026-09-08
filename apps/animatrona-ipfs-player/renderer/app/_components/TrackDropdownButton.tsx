'use client'

/**
 * TrackDropdownButton — общая раскладка кнопки-дропдауна выбора дорожки (субтитры/аудио).
 *
 * Кастомный dropdown (position: absolute), не Chakra `Menu` — `Menu.Positioner` ломается
 * в fullscreen-контейнере плеера. Портировано без изменений из
 * `apps/animatrona-folder-player/renderer/app/_components/TrackDropdownButton.tsx`.
 */

import { Box, HStack, IconButton, Text } from '@chakra-ui/react'
import { Tooltip } from '@letar/video-player-react'
import type { ReactNode } from 'react'
import { useCallback, useState } from 'react'
import { LuCheck } from 'react-icons/lu'

export interface TrackDropdownOption {
  id: string
  label: string
}

export interface TrackDropdownButtonProps {
  ariaLabel: string
  tooltip: string
  /** Иконка кнопки — цвет зависит от того, выбрана ли дорожка (не `off`/дефолтная единственная) */
  icon: (color: string) => ReactNode
  /** Первый элемент — обычно «Выключены»/«По умолчанию», дальше сами дорожки */
  options: TrackDropdownOption[]
  selectedId: string
  onSelect: (id: string) => void
}

export function TrackDropdownButton(
  { ariaLabel, tooltip, icon, options, selectedId, onSelect }: TrackDropdownButtonProps,
) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = useCallback(() => setIsOpen((prev) => !prev), [])

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id)
      setIsOpen(false)
    },
    [onSelect],
  )

  // Нечего выбирать — кнопка не показывается вовсе
  if (options.length <= 1) {
    return null
  }

  const isActive = selectedId !== 'off' && selectedId !== options[0]?.id

  return (
    <Box position="relative">
      <Tooltip content={tooltip}>
        <IconButton
          aria-label={ariaLabel}
          variant="ghost"
          colorPalette="whiteAlpha"
          size="sm"
          onClick={toggle}
        >
          {icon(isActive ? 'var(--chakra-colors-player-chapter)' : 'var(--chakra-colors-player-control)')}
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
