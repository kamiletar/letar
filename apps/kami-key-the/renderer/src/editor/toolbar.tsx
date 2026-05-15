/**
 * Тулбар — Undo/Redo/Save/Export/Import
 *
 * Индикатор позиции undo/redo стека
 */

import { Box, Button, Flex, Text } from '@chakra-ui/react'
import { useRef } from 'react'

interface ToolbarProps {
  isDirty: boolean
  canUndo: boolean
  canRedo: boolean
  undoCount: number
  redoCount: number
  onSave: () => void
  onReset: () => void
  onUndo: () => void
  onRedo: () => void
  onExport: () => void
  onImport: (file: File) => void
}

export function Toolbar({
  isDirty,
  canUndo,
  canRedo,
  undoCount,
  redoCount,
  onSave,
  onReset,
  onUndo,
  onRedo,
  onExport,
  onImport,
}: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <Box>
      <Flex align="center" gap="3" mt="4">
        <Button
          size="sm"
          bg="#2a6a2a"
          color="white"
          fontWeight="600"
          _hover={{ bg: '#3a8a3a' }}
          _disabled={{ bg: '#2a3a2a', color: '#666', cursor: 'default' }}
          disabled={!isDirty}
          onClick={onSave}
        >
          Сохранить
        </Button>
        <Button
          size="sm"
          bg="#4a2a2a"
          color="#ccc"
          border="1px solid #5a3a3a"
          _hover={{ bg: '#5a3a3a' }}
          onClick={onReset}
        >
          Сбросить
        </Button>

        {/* Undo/Redo с индикатором позиции */}
        <Flex align="center" gap="1">
          <Button
            size="sm"
            bg="#2a2a4a"
            color={canUndo ? '#ccc' : '#555'}
            border="1px solid #3a3a5a"
            _hover={canUndo ? { bg: '#3a3a5a' } : {}}
            disabled={!canUndo}
            onClick={onUndo}
            title="Ctrl+Z"
          >
            Undo
          </Button>
          {(undoCount > 0 || redoCount > 0) && (
            <Text fontSize="xs" color="#666" fontFamily="monospace" minW="40px" textAlign="center">
              {undoCount}/{undoCount + redoCount}
            </Text>
          )}
          <Button
            size="sm"
            bg="#2a2a4a"
            color={canRedo ? '#ccc' : '#555'}
            border="1px solid #3a3a5a"
            _hover={canRedo ? { bg: '#3a3a5a' } : {}}
            disabled={!canRedo}
            onClick={onRedo}
            title="Ctrl+Y"
          >
            Redo
          </Button>
        </Flex>

        <Button
          size="sm"
          bg="#1e3a4a"
          color="#4ac"
          border="1px solid #2a5a6a"
          _hover={{ bg: '#2a5a6a' }}
          onClick={onExport}
        >
          Экспорт
        </Button>
        <Button
          size="sm"
          bg="#3a1e4a"
          color="#a4c"
          border="1px solid #5a2a6a"
          _hover={{ bg: '#5a2a6a' }}
          onClick={() => fileInputRef.current?.click()}
        >
          Импорт
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              onImport(file)
            }
            e.target.value = ''
          }}
        />

        {isDirty && (
          <Text fontSize="sm" color="#a44">
            Есть несохранённые изменения
          </Text>
        )}
      </Flex>
    </Box>
  )
}
