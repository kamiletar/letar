/**
 * Панель редактирования — текущие назначения (слева), поиск символов (справа)
 */

import { Box, Grid, Stack } from '@chakra-ui/react'
import type { SymbolEntry } from '../../../shared/ipc-types'
import type { KeyMapping } from '../../../src/types'
import { DirectInput } from './direct-input'
import { KeySlotCard } from './key-slot-card'
import type { KeyDef } from './keyboard-data'
import { toHex } from './keyboard-data'
import { SymbolSearch } from './symbol-search'

interface EditorPanelProps {
  selectedKey: KeyDef
  mapping: KeyMapping | null
  symbols: SymbolEntry[]
  isDirty: boolean
  category: string | null
  onCategoryChange: (id: string) => void
  onAssign: (char: string, name: string, slot: 'char' | 'shiftChar') => void
  onRemove: (slot: 'char' | 'shiftChar') => void
  onSave: () => void
}

export function EditorPanel(
  { selectedKey, mapping, symbols, category, onCategoryChange, onAssign, onRemove }: EditorPanelProps,
) {
  const keyLabel = selectedKey.label || `VK ${toHex(selectedKey.vk)}`

  return (
    <Grid templateColumns={{ base: '1fr', md: '320px 1fr' }} gap="4" flex="1" minH="0">
      <Stack gap="3">
        <KeySlotCard
          title={`AltGr + ${keyLabel}`}
          accent="brand"
          char={mapping?.char}
          label={mapping?.label}
          emptyHint="Не назначен — выберите символ справа"
          onRemove={() => onRemove('char')}
        />
        <KeySlotCard
          title={`AltGr + Shift + ${keyLabel}`}
          accent="accent"
          char={mapping?.shiftChar}
          label={mapping?.shiftLabel}
          emptyHint={mapping ? 'Не назначен — выберите символ справа' : 'Сначала назначьте AltGr'}
          onRemove={() => onRemove('shiftChar')}
        />
        <DirectInput onAssign={onAssign} keyLabel={keyLabel} />
      </Stack>

      <Box bg="bg.panel" borderWidth="1px" borderColor="border" rounded="l3" p="3" minH="0" display="flex">
        <SymbolSearch
          symbols={symbols}
          onAssign={onAssign}
          keyLabel={keyLabel}
          category={category}
          onCategoryChange={onCategoryChange}
        />
      </Box>
    </Grid>
  )
}
