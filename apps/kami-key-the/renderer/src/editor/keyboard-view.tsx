/**
 * Визуальная клавиатура — 5 рядов ANSI с подсвеченными маппингами
 *
 * Поддержка drag-and-drop символов на клавиши
 */

import { Box, Flex } from '@chakra-ui/react'
import type { KeyMapping } from '../../../src/types'
import { KeyButton } from './key-button'
import type { KeyDef } from './keyboard-data'
import { KEYBOARD_ROWS } from './keyboard-data'

interface KeyboardViewProps {
  mappingByVk: Map<number, KeyMapping>
  selectedVk: number | null
  flashVk: number | null
  onKeyClick: (key: KeyDef) => void
  onDropOnKey: (vk: number, char: string, name: string, slot: 'char' | 'shiftChar') => void
}

export function KeyboardView({ mappingByVk, selectedVk, flashVk, onKeyClick, onDropOnKey }: KeyboardViewProps) {
  return (
    <Box mb="4">
      {KEYBOARD_ROWS.map((row, rowIdx) => (
        <Flex key={rowIdx} gap="1" mb="1">
          {row.map((key) => (
            <KeyButton
              key={key.vk}
              keyDef={key}
              mapping={mappingByVk.get(key.vk)}
              isSelected={selectedVk === key.vk}
              isFlashing={flashVk === key.vk}
              onClick={() => onKeyClick(key)}
              onDrop={(char, name, slot) => onDropOnKey(key.vk, char, name, slot)}
            />
          ))}
        </Flex>
      ))}
    </Box>
  )
}
