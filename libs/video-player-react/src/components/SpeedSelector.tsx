'use client'

/**
 * SpeedSelector — выбор скорости воспроизведения
 *
 * Используем кастомный dropdown (position: absolute) вместо Chakra Menu,
 * т.к. Menu.Positioner ломается в fullscreen-контейнере плеера.
 */

import { Box, HStack, Icon, IconButton, Text } from '@chakra-ui/react'
import { useCallback, useState } from 'react'
import { LuGauge } from 'react-icons/lu'

import { PLAYBACK_SPEEDS, type PlaybackSpeed } from '../types'
import { Tooltip } from './Tooltip'

export interface SpeedSelectorProps {
  /** Текущая скорость */
  speed: PlaybackSpeed
  /** Изменение скорости */
  onSpeedChange: (speed: PlaybackSpeed) => void
}

/**
 * Кнопка с выпадающим меню для выбора скорости воспроизведения
 */
export function SpeedSelector({ speed, onSpeedChange }: SpeedSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  const handleSelect = useCallback(
    (s: PlaybackSpeed) => {
      onSpeedChange(s)
      setIsOpen(false)
    },
    [onSpeedChange],
  )

  return (
    <Box position="relative">
      <Tooltip content={`Скорость: ${speed}x ([ / ])`}>
        <IconButton
          aria-label="Скорость воспроизведения"
          variant="ghost"
          colorPalette="whiteAlpha"
          size="sm"
          onClick={toggle}
        >
          <HStack gap={1}>
            <Icon as={LuGauge} color="player.control" />
            {speed !== 1 && (
              <Text fontSize="xs" color="player.control" fontWeight="bold">
                {speed}x
              </Text>
            )}
          </HStack>
        </IconButton>
      </Tooltip>

      {/* Невидимый оверлей для закрытия по click outside */}
      {isOpen && <Box position="fixed" inset={0} zIndex={19} onClick={() => setIsOpen(false)} />}

      {/* Выпадающее меню */}
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
          minW="120px"
          zIndex={20}
        >
          {PLAYBACK_SPEEDS.map((s) => (
            <Box
              key={s}
              px={3}
              py={1.5}
              cursor="pointer"
              bg={speed === s ? 'whiteAlpha.100' : 'transparent'}
              color={speed === s ? 'purple.300' : 'white'}
              _hover={{ bg: 'whiteAlpha.200' }}
              onClick={() => handleSelect(s)}
            >
              <HStack justify="space-between" w="full">
                <Text fontSize="sm">{s}x</Text>
                {s === 1 && (
                  <Text fontSize="xs" color="gray.500">
                    Обычная
                  </Text>
                )}
              </HStack>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  )
}
