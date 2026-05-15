/**
 * Табы раскладок — переключение, добавление, удаление, переименование
 *
 * Используем Chakra Dialog вместо browser prompt/confirm
 */

import { Box, Button, Dialog, Flex, Input, Portal, Text } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import type { KeymapConfig } from '../../../src/types'

interface LayoutTabsProps {
  config: KeymapConfig
  activeIndex: number
  onSelect: (index: number) => void
  onAdd: (name: string) => void
  onDelete: (index: number) => void
  onRename: (index: number, name: string) => void
}

export function LayoutTabs({ config, activeIndex, onSelect, onAdd, onDelete, onRename }: LayoutTabsProps) {
  // Диалог переименования
  const [renameOpen, setRenameOpen] = useState(false)
  const [renameIndex, setRenameIndex] = useState(0)
  const [renameName, setRenameName] = useState('')
  const renameInputRef = useRef<HTMLInputElement>(null)

  // Диалог добавления
  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  // Диалог удаления
  const [deleteOpen, setDeleteOpen] = useState(false)

  const existingNames = config.layouts.map((l) => l.name)

  const handleRenameConfirm = () => {
    const trimmed = renameName.trim()
    if (trimmed && !existingNames.some((n, i) => i !== renameIndex && n === trimmed)) {
      onRename(renameIndex, trimmed)
    }
    setRenameOpen(false)
  }

  const handleAddConfirm = () => {
    const trimmed = addName.trim()
    if (trimmed && !existingNames.includes(trimmed)) {
      onAdd(trimmed)
    }
    setAddOpen(false)
    setAddName('')
  }

  const handleDeleteConfirm = () => {
    onDelete(activeIndex)
    setDeleteOpen(false)
  }

  return (
    <>
      <Flex gap="1.5" align="center" mb="4" flexWrap="wrap">
        {config.layouts.map((layout, i) => (
          <Box
            key={i}
            px="4"
            py="1.5"
            borderRadius="6px"
            bg={i === activeIndex ? '#4a4a8a' : '#2a2a4a'}
            border={i === activeIndex ? '1px solid #6c7ae0' : '1px solid #3a3a5a'}
            color={i === activeIndex ? 'white' : '#aaa'}
            fontWeight={i === activeIndex ? '600' : 'normal'}
            cursor="pointer"
            fontSize="sm"
            userSelect="none"
            _hover={{ bg: '#3a3a5a', color: 'white' }}
            onClick={() => onSelect(i)}
            onDoubleClick={() => {
              setRenameIndex(i)
              setRenameName(layout.name)
              setRenameOpen(true)
            }}
          >
            {layout.name}
          </Box>
        ))}

        {/* Кнопка добавления */}
        <Box
          px="4"
          py="1.5"
          borderRadius="6px"
          bg="#1e3a1e"
          border="1px solid #2a5a2a"
          color="#4a8"
          cursor="pointer"
          fontSize="sm"
          userSelect="none"
          _hover={{ bg: '#2a5a2a' }}
          onClick={() => {
            setAddName('')
            setAddOpen(true)
          }}
        >
          + Новая
        </Box>

        {/* Кнопка удаления (только если > 1 раскладки) */}
        {config.layouts.length > 1 && (
          <Box
            px="2.5"
            py="1.5"
            borderRadius="6px"
            bg="#3a1e1e"
            border="1px solid #5a2a2a"
            color="#a44"
            cursor="pointer"
            fontSize="sm"
            userSelect="none"
            _hover={{ bg: '#5a2a2a' }}
            onClick={() => setDeleteOpen(true)}
          >
            {'\uD83D\uDDD1'}
          </Box>
        )}
      </Flex>

      {/* Диалог переименования */}
      <Dialog.Root
        lazyMount
        open={renameOpen}
        onOpenChange={(e) => setRenameOpen(e.open)}
        initialFocusEl={() => renameInputRef.current}
        size="sm"
      >
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.700" />
          <Dialog.Positioner>
            <Dialog.Content bg="#222244" color="#e0e0e0" borderColor="#3a3a5a">
              <Dialog.Header borderBottom="1px solid #3a3a5a">
                <Dialog.Title>Переименовать раскладку</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body py="4">
                <Input
                  ref={renameInputRef}
                  value={renameName}
                  onChange={(e) => setRenameName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleRenameConfirm()
                    }
                  }}
                  bg="#1a1a2e"
                  border="1px solid #3a3a5a"
                  _focus={{ borderColor: '#6c7ae0' }}
                  placeholder="Имя раскладки"
                />
                {renameName.trim() && existingNames.some((n, i) => i !== renameIndex && n === renameName.trim()) && (
                  <Text color="#c66" fontSize="xs" mt="1">
                    Раскладка с таким именем уже существует
                  </Text>
                )}
              </Dialog.Body>
              <Dialog.Footer borderTop="1px solid #3a3a5a">
                <Dialog.ActionTrigger asChild>
                  <Button size="sm" bg="#2a2a4a" color="#aaa" border="1px solid #3a3a5a" _hover={{ bg: '#3a3a5a' }}>
                    Отмена
                  </Button>
                </Dialog.ActionTrigger>
                <Button
                  size="sm"
                  bg="#2a6a2a"
                  color="white"
                  _hover={{ bg: '#3a8a3a' }}
                  disabled={
                    !renameName.trim() || existingNames.some((n, i) => i !== renameIndex && n === renameName.trim())
                  }
                  onClick={handleRenameConfirm}
                >
                  Сохранить
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Диалог добавления */}
      <Dialog.Root
        lazyMount
        open={addOpen}
        onOpenChange={(e) => setAddOpen(e.open)}
        initialFocusEl={() => addInputRef.current}
        size="sm"
      >
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.700" />
          <Dialog.Positioner>
            <Dialog.Content bg="#222244" color="#e0e0e0" borderColor="#3a3a5a">
              <Dialog.Header borderBottom="1px solid #3a3a5a">
                <Dialog.Title>Новая раскладка</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body py="4">
                <Input
                  ref={addInputRef}
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddConfirm()
                    }
                  }}
                  bg="#1a1a2e"
                  border="1px solid #3a3a5a"
                  _focus={{ borderColor: '#6c7ae0' }}
                  placeholder="Имя раскладки"
                />
                {addName.trim() && existingNames.includes(addName.trim()) && (
                  <Text color="#c66" fontSize="xs" mt="1">
                    Раскладка с таким именем уже существует
                  </Text>
                )}
              </Dialog.Body>
              <Dialog.Footer borderTop="1px solid #3a3a5a">
                <Dialog.ActionTrigger asChild>
                  <Button size="sm" bg="#2a2a4a" color="#aaa" border="1px solid #3a3a5a" _hover={{ bg: '#3a3a5a' }}>
                    Отмена
                  </Button>
                </Dialog.ActionTrigger>
                <Button
                  size="sm"
                  bg="#2a6a2a"
                  color="white"
                  _hover={{ bg: '#3a8a3a' }}
                  disabled={!addName.trim() || existingNames.includes(addName.trim())}
                  onClick={handleAddConfirm}
                >
                  Создать
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Диалог удаления */}
      <Dialog.Root lazyMount role="alertdialog" open={deleteOpen} onOpenChange={(e) => setDeleteOpen(e.open)} size="sm">
        <Portal>
          <Dialog.Backdrop bg="blackAlpha.700" />
          <Dialog.Positioner>
            <Dialog.Content bg="#222244" color="#e0e0e0" borderColor="#3a3a5a">
              <Dialog.Header borderBottom="1px solid #3a3a5a">
                <Dialog.Title>Удалить раскладку</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body py="4">
                <Text>
                  {'Удалить раскладку \u00AB'}
                  <Text as="span" fontWeight="600" color="white">
                    {config.layouts[activeIndex]?.name}
                  </Text>
                  {'\u00BB? Это действие можно отменить через Undo.'}
                </Text>
              </Dialog.Body>
              <Dialog.Footer borderTop="1px solid #3a3a5a">
                <Dialog.ActionTrigger asChild>
                  <Button size="sm" bg="#2a2a4a" color="#aaa" border="1px solid #3a3a5a" _hover={{ bg: '#3a3a5a' }}>
                    Отмена
                  </Button>
                </Dialog.ActionTrigger>
                <Button size="sm" bg="#5a2a2a" color="#e66" _hover={{ bg: '#6a3a3a' }} onClick={handleDeleteConfirm}>
                  Удалить
                </Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
