/**
 * Отдельная страница клавиши — крупное изображение (EN/RU) + панель назначения
 *
 * Заменяет собой инлайновое разворачивание панели под клавиатурой: адрес хранится
 * в route (см. editor-route.ts), «Назад» возвращает на клавиатуру.
 */

import { Box, Button, Flex, Text } from '@chakra-ui/react'
import type { SymbolEntry } from '../../../shared/ipc-types'
import type { KeyMapping } from '../../../src/types'
import { EditorPanel } from './editor-panel'
import type { KeyDef } from './keyboard-data'
import { toHex } from './keyboard-data'

interface KeyPageProps {
  keyDef: KeyDef
  mapping: KeyMapping | null
  symbols: SymbolEntry[]
  isDirty: boolean
  category: string | null
  onCategoryChange: (id: string) => void
  onAssign: (char: string, name: string, slot: 'char' | 'shiftChar') => void
  onRemove: (slot: 'char' | 'shiftChar') => void
  onSave: () => void
  onBack: () => void
}

export function KeyPage({ keyDef, onBack, ...panelProps }: KeyPageProps) {
  return (
    <Box>
      <Button
        size="sm"
        variant="ghost"
        color="#8a9af0"
        mb="3"
        onClick={onBack}
        _hover={{ bg: '#2a2a4a' }}
      >
        {'← Назад к клавиатуре'}
      </Button>

      {/* Крупное изображение клавиши: EN сверху, RU снизу */}
      <Flex
        justify="center"
        align="center"
        direction="column"
        bg="#222244"
        border="1px solid #3a3a5a"
        borderRadius="8px"
        py="6"
        mb="4"
      >
        <Text fontSize="6xl" fontWeight="700" color="white" lineHeight="1">
          {keyDef.label || 'Space'}
        </Text>
        {keyDef.ru && (
          <Text fontSize="2xl" color="#888" mt="1">
            {keyDef.ru}
          </Text>
        )}
        <Text fontSize="xs" color="#555" mt="2" fontFamily="monospace">
          {toHex(keyDef.vk)}
        </Text>
      </Flex>

      <EditorPanel selectedKey={keyDef} {...panelProps} />
    </Box>
  )
}
