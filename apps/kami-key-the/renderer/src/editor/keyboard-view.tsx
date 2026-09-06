/**
 * Визуальная клавиатура — 5 рядов ANSI с подсвеченными маппингами
 *
 * Поддержка drag-and-drop символов на клавиши
 */

import { Box, Flex } from '@chakra-ui/react'
import type { KeyMapping } from '../../../src/types'
import { KeyButton } from './key-button'
import type { KeyDef } from './keyboard-data'
import { ARROW_KEYS, KEYBOARD_ROWS } from './keyboard-data'

const KEY_SIZE = 56
const KEY_GAP = 4
const UNIT = KEY_SIZE + KEY_GAP

interface KeyRowProps {
  mappingByVk: Map<number, KeyMapping>
  selectedVk: number | null
  flashVk: number | null
  onKeyClick: (key: KeyDef) => void
  onDropOnKey: (vk: number, char: string, name: string, slot: 'char' | 'shiftChar') => void
}

/** Одна клавиша с общими пропсами, вынесенная для переиспользования в основном блоке и в блоке стрелок */
function renderKey(key: KeyDef, { mappingByVk, selectedVk, flashVk, onKeyClick, onDropOnKey }: KeyRowProps) {
  return (
    <KeyButton
      key={key.vk}
      keyDef={key}
      mapping={mappingByVk.get(key.vk)}
      isSelected={selectedVk === key.vk}
      isFlashing={flashVk === key.vk}
      onClick={() => onKeyClick(key)}
      onDrop={(char, name, slot) => onDropOnKey(key.vk, char, name, slot)}
    />
  )
}

/** Физический блок стрелок — инвертированная «Т», как на реальной клавиатуре */
function ArrowCluster(props: KeyRowProps) {
  return (
    <Box>
      <Flex gap="1" mb="1">
        <Box w={`${UNIT - KEY_GAP}px`} flexShrink={0} />
        {renderKey(ARROW_KEYS.up, props)}
        <Box w={`${UNIT - KEY_GAP}px`} flexShrink={0} />
      </Flex>
      <Flex gap="1">
        {renderKey(ARROW_KEYS.left, props)}
        {renderKey(ARROW_KEYS.down, props)}
        {renderKey(ARROW_KEYS.right, props)}
      </Flex>
    </Box>
  )
}

interface KeyboardViewProps {
  mappingByVk: Map<number, KeyMapping>
  selectedVk: number | null
  flashVk: number | null
  onKeyClick: (key: KeyDef) => void
  onDropOnKey: (vk: number, char: string, name: string, slot: 'char' | 'shiftChar') => void
}

export function KeyboardView(props: KeyboardViewProps) {
  return (
    <Flex mb="4" align="flex-end" gap="6">
      <Box>
        {KEYBOARD_ROWS.map((row, rowIdx) => (
          <Flex key={rowIdx} gap="1" mb="1">
            {row.map((key) => renderKey(key, props))}
          </Flex>
        ))}
      </Box>
      <ArrowCluster {...props} />
    </Flex>
  )
}
