/**
 * Панель редактирования — текущие назначения, поиск символов, прямой ввод
 *
 * Улучшенный UX: понятные состояния, подсказки, контекстные кнопки
 */

import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react'
import type { SymbolEntry } from '../../../shared/ipc-types'
import type { KeyMapping } from '../../../src/types'
import { DirectInput } from './direct-input'
import type { KeyDef } from './keyboard-data'
import { displayChar, toHex, toUnicode } from './keyboard-data'
import { SymbolSearch } from './symbol-search'

interface EditorPanelProps {
  selectedKey: KeyDef
  mapping: KeyMapping | null
  symbols: SymbolEntry[]
  isDirty: boolean
  onAssign: (char: string, name: string, slot: 'char' | 'shiftChar') => void
  onRemove: (slot: 'char' | 'shiftChar') => void
  onSave: () => void
}

export function EditorPanel({ selectedKey, mapping, symbols, isDirty, onAssign, onRemove, onSave }: EditorPanelProps) {
  const keyLabel = selectedKey.label || `VK ${toHex(selectedKey.vk)}`
  const keyRu = selectedKey.ru ? ` / ${selectedKey.ru}` : ''

  return (
    <Box bg="#222244" borderRadius="8px" p="4" mb="4" border="1px solid #3a3a5a">
      {/* Заголовок с кнопкой сохранения */}
      <Flex align="center" justify="space-between" mb="3">
        <Heading as="h3" size="md" color="white">
          {'Клавиша '}
          <Text as="span" color="#6c7ae0" fontWeight="700">
            {keyLabel}
            {keyRu}
          </Text>
          <Text as="span" color="#555" fontSize="xs" ml="2" fontWeight="normal">
            {toHex(selectedKey.vk)}
          </Text>
        </Heading>
        {isDirty && (
          <Button size="sm" bg="#2a6a2a" color="white" fontWeight="600" _hover={{ bg: '#3a8a3a' }} onClick={onSave}>
            Сохранить (Ctrl+S)
          </Button>
        )}
      </Flex>

      {/* Текущие назначения */}
      <Box mb="4" bg="#1a1a2e" borderRadius="6px" p="3">
        {/* AltGr слот */}
        <Flex align="center" gap="3" mb="2">
          <Box
            bg="#1e2a4a"
            borderRadius="4px"
            px="2"
            py="0.5"
            fontSize="xs"
            color="#6c7ae0"
            fontWeight="600"
            minW="90px"
            textAlign="center"
          >
            AltGr+{keyLabel}
          </Box>
          {mapping
            ? (
              <>
                <Text fontSize="2xl" w="40px" textAlign="center" color="#6c7ae0">
                  {displayChar(mapping.char)}
                </Text>
                <Text color="#888" fontSize="xs" flex="1">
                  {toUnicode(mapping.char)} {mapping.label}
                </Text>
                <Button
                  size="xs"
                  bg="#3a1e1e"
                  color="#c66"
                  border="1px solid #5a3a3a"
                  _hover={{ bg: '#5a2a2a' }}
                  onClick={() => onRemove('char')}
                >
                  Убрать
                </Button>
              </>
            )
            : (
              <Text color="#555" fontSize="sm" fontStyle="italic">
                не назначен
              </Text>
            )}
        </Flex>

        {/* AltGr+Shift слот */}
        <Flex align="center" gap="3">
          <Box
            bg="#1e2040"
            borderRadius="4px"
            px="2"
            py="0.5"
            fontSize="xs"
            color="#4a6ae0"
            fontWeight="600"
            minW="90px"
            textAlign="center"
          >
            AltGr+Shift+{keyLabel}
          </Box>
          {mapping?.shiftChar
            ? (
              <>
                <Text fontSize="2xl" w="40px" textAlign="center" color="#4a6ae0">
                  {displayChar(mapping.shiftChar)}
                </Text>
                <Text color="#888" fontSize="xs" flex="1">
                  {toUnicode(mapping.shiftChar)} {mapping.shiftLabel ?? ''}
                </Text>
                <Button
                  size="xs"
                  bg="#3a1e1e"
                  color="#c66"
                  border="1px solid #5a3a3a"
                  _hover={{ bg: '#5a2a2a' }}
                  onClick={() => onRemove('shiftChar')}
                >
                  Убрать
                </Button>
              </>
            )
            : (
              <Text color="#555" fontSize="sm" fontStyle="italic">
                {mapping ? 'не назначен' : 'сначала назначьте AltGr'}
              </Text>
            )}
        </Flex>
      </Box>

      {/* Назначение символа */}
      <Text color="#888" fontSize="xs" mb="2" fontWeight="600" textTransform="uppercase" letterSpacing="0.05em">
        Назначить символ на {keyLabel}:
      </Text>

      {/* Поиск символов */}
      <SymbolSearch symbols={symbols} onAssign={onAssign} keyLabel={keyLabel} />

      {/* Прямой ввод Unicode */}
      <DirectInput onAssign={onAssign} keyLabel={keyLabel} />
    </Box>
  )
}
