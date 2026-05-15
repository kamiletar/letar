'use client'

/**
 * SharedVolumeControl — контроль громкости (кнопка mute + слайдер)
 */

import { HStack, Icon, IconButton, Slider } from '@chakra-ui/react'
import { LuVolume2, LuVolumeX } from 'react-icons/lu'

import { Tooltip } from './Tooltip'

export interface SharedVolumeControlProps {
  /** Громкость (0-1) */
  volume: number
  /** Звук выключен */
  isMuted: boolean
  /** Изменение громкости */
  onVolumeChange: (value: number[]) => void
  /** Toggle mute */
  onToggleMute: () => void
}

/**
 * Контроль громкости: кнопка mute + горизонтальный слайдер
 */
export function SharedVolumeControl({ volume, isMuted, onVolumeChange, onToggleMute }: SharedVolumeControlProps) {
  return (
    <HStack gap={1} w="120px">
      <Tooltip content={isMuted ? 'Включить звук (M)' : 'Выключить звук (M)'}>
        <IconButton
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          variant="ghost"
          colorPalette="whiteAlpha"
          size="sm"
          onClick={onToggleMute}
        >
          <Icon as={isMuted ? LuVolumeX : LuVolume2} color="player.control" />
        </IconButton>
      </Tooltip>

      <Slider.Root
        value={[isMuted ? 0 : volume * 100]}
        min={0}
        max={100}
        step={1}
        onValueChange={(e) => onVolumeChange(e.value)}
        flex={1}
      >
        <Slider.Control>
          <Slider.Track h="4px" bg="player.track">
            <Slider.Range bg="player.thumb" />
          </Slider.Track>
          <Slider.Thumb index={0} boxSize={3} bg="player.thumb" />
        </Slider.Control>
      </Slider.Root>
    </HStack>
  )
}
