'use client'

import type { MidiDevice } from '@/lib/audio/midi-input'
import { Box, HStack, Text } from '@chakra-ui/react'
import type React from 'react'
import { outlineButtonStyle } from './button-style'

interface MidiStatusProps {
  devices: MidiDevice[]
  octaveShift: number
  onOctaveShift: (delta: number) => void
  onConnect: () => void
  error: string | null
}

const btnStyle = (disabled: boolean): React.CSSProperties =>
  outlineButtonStyle(disabled ? 'disabled' : 'default', { padding: '2px 8px', lineHeight: 1.4, monospace: true })

export function MidiStatus({ devices, octaveShift, onOctaveShift, onConnect, error }: MidiStatusProps) {
  const connected = devices.length > 0
  const octaveLabel = octaveShift === 0 ? 'Oct 0' : octaveShift > 0 ? `+${octaveShift / 12}` : `${octaveShift / 12}`

  return (
    <HStack
      gap={3}
      px={3}
      py={2}
      bg="bg.surface"
      borderRadius="md"
      borderWidth="1px"
      borderColor="border.subtle"
      flexWrap="wrap"
    >
      {/* Индикатор подключения */}
      <HStack gap={2} flexShrink={0}>
        <Box
          w="6px"
          h="6px"
          borderRadius="full"
          bg={error ? 'red.400' : connected ? 'green.400' : 'gray.600'}
          flexShrink={0}
        />
        <Text
          color={error ? 'red.300' : connected ? 'fg.DEFAULT' : 'fg.muted'}
          fontFamily="mono"
          fontSize="10px"
          letterSpacing="0.04em"
        >
          {error ?? (connected ? devices[0].name : 'MIDI не подключён')}
        </Text>
        {connected && devices[0].manufacturer && (
          <Text fontSize="9px" color="fg.subtle" fontFamily="mono">
            ({devices[0].manufacturer})
          </Text>
        )}
      </HStack>

      {/* Кнопка «Подключить» — только если нет ни соединения, ни ошибки */}
      {!connected && !error && (
        <button onClick={onConnect} style={btnStyle(false)}>
          Подключить MIDI
        </button>
      )}

      {/* При ошибке — попробовать снова */}
      {error && (
        <button onClick={onConnect} style={btnStyle(false)}>
          Повторить
        </button>
      )}

      {/* Сдвиг октавы — только при подключённом устройстве */}
      {connected && (
        <HStack gap={1} ml="auto">
          <Text fontSize="9px" color="fg.subtle" mr={1}>
            Окт:
          </Text>
          <button style={btnStyle(octaveShift <= -24)} onClick={() => onOctaveShift(-12)}>
            −
          </button>
          <Text fontFamily="mono" fontSize="9px" color="fg.muted" minW="36px" textAlign="center">
            {octaveLabel}
          </Text>
          <button style={btnStyle(octaveShift >= 24)} onClick={() => onOctaveShift(+12)}>
            +
          </button>
        </HStack>
      )}
    </HStack>
  )
}
