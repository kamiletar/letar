/**
 * Визуальная клавиатура — 5 рядов ANSI с подсвеченными маппингами
 *
 * Масштабируется под ширину контейнера (ResizeObserver, см. use-element-width.ts) — блок клавиш
 * занимает 15 единиц в ряд + блок стрелок 3 единицы, между ними отступ 0.4U.
 *
 * Поддержка drag-and-drop символов на клавиши
 */

import { Box, Flex, Text } from '@chakra-ui/react'
import type { KeyMapping } from '../../../src/types'
import { KeyButton } from './key-button'
import type { KeyDef } from './keyboard-data'
import { ARROW_KEYS, KEYBOARD_ROWS } from './keyboard-data'
import { useElementWidth } from './use-element-width'

const GAP = 6
const MIN_UNIT = 44
const MAX_UNIT = 80

interface KeyRowProps {
  mappingByVk: Map<number, KeyMapping>
  selectedVk: number | null
  flashVk: number | null
  unit: number
  gap: number
  onKeyClick: (key: KeyDef) => void
  onDropOnKey: (vk: number, char: string, name: string, slot: 'char' | 'shiftChar') => void
}

/** Одна клавиша с общими пропсами, вынесенная для переиспользования в основном блоке и в блоке стрелок */
function renderKey(key: KeyDef, { mappingByVk, selectedVk, flashVk, unit, gap, onKeyClick, onDropOnKey }: KeyRowProps) {
  return (
    <KeyButton
      key={key.vk}
      keyDef={key}
      mapping={mappingByVk.get(key.vk)}
      isSelected={selectedVk === key.vk}
      isFlashing={flashVk === key.vk}
      unit={unit}
      gap={gap}
      onClick={() => onKeyClick(key)}
      onDrop={(char, name, slot) => onDropOnKey(key.vk, char, name, slot)}
    />
  )
}

/** Физический блок стрелок — инвертированная «Т», как на реальной клавиатуре */
function ArrowCluster(props: KeyRowProps) {
  const { unit, gap } = props
  return (
    <Box>
      <Flex gap={`${gap}px`} mb={`${gap}px`}>
        <Box w={`${unit - gap}px`} flexShrink={0} />
        {renderKey(ARROW_KEYS.up, props)}
        <Box w={`${unit - gap}px`} flexShrink={0} />
      </Flex>
      <Flex gap={`${gap}px`}>
        {renderKey(ARROW_KEYS.left, props)}
        {renderKey(ARROW_KEYS.down, props)}
        {renderKey(ARROW_KEYS.right, props)}
      </Flex>
    </Box>
  )
}

/** Подсказка под клавиатурой: что значат цвета, счётчик назначенных символов */
function KeyboardLegend({ assignedCount }: { assignedCount: number }) {
  return (
    <Flex align="center" justify="center" gap="5" mt="4" flexWrap="wrap" fontSize="xs" color="fg.subtle">
      <Flex align="center" gap="1.5">
        <Box w="10px" h="10px" rounded="sm" bg="bg.muted" borderWidth="1px" borderColor="border" />
        клавиша
      </Flex>
      <Flex align="center" gap="1.5">
        <Box w="10px" h="10px" rounded="sm" bg="brand.subtle" borderWidth="1px" borderColor="brand.border" />
        AltGr + клавиша
      </Flex>
      <Flex align="center" gap="1.5">
        <Text color="accent.fg" fontWeight="700">
          A
        </Text>
        AltGr + Shift
      </Flex>
      <Text>Назначено символов: {assignedCount}</Text>
      <Text>Выберите клавишу, чтобы назначить символ</Text>
    </Flex>
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
  const [containerRef, width] = useElementWidth<HTMLDivElement>()
  const unit = width > 0 ? Math.min(MAX_UNIT, Math.max(MIN_UNIT, Math.floor((width + 2 * GAP) / 18.4))) : MIN_UNIT
  const rowProps: KeyRowProps = { ...props, unit, gap: GAP }
  const assignedCount = props.mappingByVk.size

  return (
    <Box ref={containerRef}>
      <Flex justify="center" align="flex-end" gap={`${unit * 0.4}px`} flexWrap="wrap">
        <Box>
          {KEYBOARD_ROWS.map((row, rowIdx) => (
            <Flex key={rowIdx} gap={`${GAP}px`} mb={`${GAP}px`}>
              {row.map((key) => renderKey(key, rowProps))}
            </Flex>
          ))}
        </Box>
        <ArrowCluster {...rowProps} />
      </Flex>
      <KeyboardLegend assignedCount={assignedCount} />
    </Box>
  )
}
