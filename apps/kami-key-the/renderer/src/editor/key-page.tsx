/**
 * Отдельная страница клавиши — назначение символов
 *
 * Заменяет собой инлайновое разворачивание панели под клавиатурой: адрес хранится
 * в route (см. editor-route.ts), «Назад» возвращает на клавиатуру.
 */

import { chakra, Flex, Text } from '@chakra-ui/react'
import { LuArrowLeft } from 'react-icons/lu'
import type { SymbolEntry } from '../../../shared/ipc-types'
import type { KeyMapping } from '../../../src/types'
import { EditorPanel } from './editor-panel'
import type { KeyDef } from './keyboard-data'

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
    <Flex direction="column" h="full" gap="4" minH="520px">
      <Flex align="center" gap="3">
        <chakra.button
          type="button"
          display="flex"
          alignItems="center"
          gap="1.5"
          px="2.5"
          h="8"
          rounded="l2"
          fontSize="sm"
          color="fg.muted"
          _hover={{ bg: 'bg.muted' }}
          onClick={onBack}
        >
          <LuArrowLeft size={15} />
          Клавиатура
        </chakra.button>

        <Flex align="baseline" gap="1" bg="bg.muted" px="2.5" py="1" rounded="l2">
          <Text fontSize="lg" fontWeight="700" color="fg">
            {keyDef.label || 'Space'}
          </Text>
          {keyDef.ru && (
            <Text fontSize="sm" color="fg.subtle">
              {keyDef.ru}
            </Text>
          )}
        </Flex>

        <Text fontSize="sm" color="fg" fontWeight="600">
          {`Клавиша ${keyDef.label || 'Пробел'}`}
        </Text>

        <Flex flex="1" />
        <Text fontSize="xs" color="fg.subtle">
          Esc — назад
        </Text>
      </Flex>

      <EditorPanel selectedKey={keyDef} {...panelProps} />
    </Flex>
  )
}
