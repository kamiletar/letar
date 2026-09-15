/**
 * Вкладки раскладок — переключение, добавление, переименование, экспорт/импорт, удаление
 *
 * Вкладка, совпадающая с `config.activeLayout` (работает сейчас в системе через AltGr+Ё),
 * отмечена зелёной точкой — это может отличаться от выбранной в UI вкладки (`activeIndex`).
 * Меню «⋯» — только у выбранной вкладки, действия применяются к ней по индексу, не по
 * подразумеваемому activeIndex (баг старой версии: удаление всегда стирало именно activeIndex).
 */

import { chakra, Dialog, Flex, IconButton, Input, Menu, Portal, Text, Tooltip as ChakraTooltip } from '@chakra-ui/react'
import { useRef, useState } from 'react'
import { LuDownload, LuEllipsis, LuPencil, LuPlus, LuTrash2, LuUpload } from 'react-icons/lu'
import type { KeymapConfig } from '../../../src/types'

interface LayoutTabsProps {
  config: KeymapConfig
  activeIndex: number
  onSelect: (index: number) => void
  onAdd: (name: string) => void
  onDelete: (index: number) => void
  onRename: (index: number, name: string) => void
  onMakeActive: (index: number) => void
  onExport: (index: number) => void
  onImport: (file: File) => void
}

export function LayoutTabs(
  { config, activeIndex, onSelect, onAdd, onDelete, onRename, onMakeActive, onExport, onImport }: LayoutTabsProps,
) {
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
  const [deleteIndex, setDeleteIndex] = useState(0)

  const importInputRef = useRef<HTMLInputElement>(null)

  const existingNames = config.layouts.map((l) => l.name)

  const openRename = (i: number) => {
    setRenameIndex(i)
    setRenameName(config.layouts[i].name)
    setRenameOpen(true)
  }

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
    onDelete(deleteIndex)
    setDeleteOpen(false)
  }

  return (
    <>
      <Flex gap="1.5" align="center" flexWrap="wrap">
        {config.layouts.map((layout, i) => (
          <Flex key={i} align="center" gap="0.5">
            <ChakraTooltip.Root open={layout.name === config.activeLayout ? undefined : false} openDelay={300}>
              <ChakraTooltip.Trigger asChild>
                <chakra.button
                  type="button"
                  role="tab"
                  aria-selected={i === activeIndex}
                  display="flex"
                  alignItems="center"
                  gap="1.5"
                  px="3.5"
                  py="1.5"
                  rounded="l2"
                  bg={i === activeIndex ? 'brand.subtle' : 'bg.muted'}
                  borderWidth="1px"
                  borderColor={i === activeIndex ? 'brand.border' : 'border'}
                  color={i === activeIndex ? 'brand.fg' : 'fg.muted'}
                  fontWeight={i === activeIndex ? '600' : '500'}
                  fontSize="sm"
                  userSelect="none"
                  _hover={{ bg: i === activeIndex ? 'brand.emphasized' : 'bg.emphasized' }}
                  _focusVisible={{ outline: '2px solid', outlineColor: 'brand.focusRing', outlineOffset: '2px' }}
                  onClick={() => onSelect(i)}
                  onDoubleClick={() => openRename(i)}
                >
                  {layout.name === config.activeLayout && (
                    <chakra.span w="6px" h="6px" rounded="full" bg="brand.solid" flexShrink={0} />
                  )}
                  {layout.name}
                </chakra.button>
              </ChakraTooltip.Trigger>
              <Portal>
                <ChakraTooltip.Positioner>
                  <ChakraTooltip.Content>Работает сейчас · переключение AltGr+Ё</ChakraTooltip.Content>
                </ChakraTooltip.Positioner>
              </Portal>
            </ChakraTooltip.Root>

            {i === activeIndex && (
              <Menu.Root>
                <Menu.Trigger asChild>
                  <IconButton aria-label="Действия с раскладкой" size="xs" variant="ghost" color="fg.muted">
                    <LuEllipsis size={14} />
                  </IconButton>
                </Menu.Trigger>
                <Portal>
                  <Menu.Positioner>
                    <Menu.Content>
                      {layout.name !== config.activeLayout && (
                        <Menu.Item
                          value="make-active"
                          onClick={() => onMakeActive(i)}
                        >
                          Сделать активной
                        </Menu.Item>
                      )}
                      <Menu.Item value="rename" onClick={() => openRename(i)}>
                        <LuPencil size={14} />
                        Переименовать
                      </Menu.Item>
                      <Menu.Item value="export" onClick={() => onExport(i)}>
                        <LuDownload size={14} />
                        Экспорт в файл
                      </Menu.Item>
                      <Menu.Item value="import" onClick={() => importInputRef.current?.click()}>
                        <LuUpload size={14} />
                        Импорт из файла
                      </Menu.Item>
                      <Menu.Separator />
                      <Menu.Item
                        value="delete"
                        color="fg.error"
                        disabled={config.layouts.length <= 1}
                        onClick={() => {
                          setDeleteIndex(i)
                          setDeleteOpen(true)
                        }}
                      >
                        <LuTrash2 size={14} />
                        Удалить
                      </Menu.Item>
                    </Menu.Content>
                  </Menu.Positioner>
                </Portal>
              </Menu.Root>
            )}
          </Flex>
        ))}

        <IconButton
          aria-label="Новая раскладка"
          size="sm"
          variant="ghost"
          color="brand.fg"
          onClick={() => {
            setAddName('')
            setAddOpen(true)
          }}
        >
          <LuPlus size={16} />
        </IconButton>

        <input
          ref={importInputRef}
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
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
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
                  placeholder="Имя раскладки"
                />
                {renameName.trim() && existingNames.some((n, i) => i !== renameIndex && n === renameName.trim()) && (
                  <Text color="fg.error" fontSize="xs" mt="1">
                    Раскладка с таким именем уже существует
                  </Text>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <chakra.button
                    px="3"
                    py="1.5"
                    rounded="l2"
                    fontSize="sm"
                    color="fg.muted"
                    _hover={{ bg: 'bg.muted' }}
                  >
                    Отмена
                  </chakra.button>
                </Dialog.ActionTrigger>
                <chakra.button
                  px="3"
                  py="1.5"
                  rounded="l2"
                  fontSize="sm"
                  fontWeight="600"
                  bg="brand.solid"
                  color="brand.contrast"
                  _hover={{ bg: 'brand.emphasized' }}
                  _disabled={{ opacity: 0.5, cursor: 'default' }}
                  disabled={!renameName.trim()
                    || existingNames.some((n, i) => i !== renameIndex && n === renameName.trim())}
                  onClick={handleRenameConfirm}
                >
                  Сохранить
                </chakra.button>
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
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
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
                  placeholder="Имя раскладки"
                />
                {addName.trim() && existingNames.includes(addName.trim()) && (
                  <Text color="fg.error" fontSize="xs" mt="1">
                    Раскладка с таким именем уже существует
                  </Text>
                )}
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <chakra.button
                    px="3"
                    py="1.5"
                    rounded="l2"
                    fontSize="sm"
                    color="fg.muted"
                    _hover={{ bg: 'bg.muted' }}
                  >
                    Отмена
                  </chakra.button>
                </Dialog.ActionTrigger>
                <chakra.button
                  px="3"
                  py="1.5"
                  rounded="l2"
                  fontSize="sm"
                  fontWeight="600"
                  bg="brand.solid"
                  color="brand.contrast"
                  _hover={{ bg: 'brand.emphasized' }}
                  _disabled={{ opacity: 0.5, cursor: 'default' }}
                  disabled={!addName.trim() || existingNames.includes(addName.trim())}
                  onClick={handleAddConfirm}
                >
                  Создать
                </chakra.button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>

      {/* Диалог удаления */}
      <Dialog.Root lazyMount role="alertdialog" open={deleteOpen} onOpenChange={(e) => setDeleteOpen(e.open)} size="sm">
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Header>
                <Dialog.Title>Удалить раскладку</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body py="4">
                <Text>
                  {'Удалить раскладку «'}
                  <chakra.span fontWeight="600" color="fg">
                    {config.layouts[deleteIndex]?.name}
                  </chakra.span>
                  {'»? Это действие можно отменить через Undo.'}
                </Text>
              </Dialog.Body>
              <Dialog.Footer>
                <Dialog.ActionTrigger asChild>
                  <chakra.button
                    px="3"
                    py="1.5"
                    rounded="l2"
                    fontSize="sm"
                    color="fg.muted"
                    _hover={{ bg: 'bg.muted' }}
                  >
                    Отмена
                  </chakra.button>
                </Dialog.ActionTrigger>
                <chakra.button
                  px="3"
                  py="1.5"
                  rounded="l2"
                  fontSize="sm"
                  fontWeight="600"
                  bg="border.error"
                  color="white"
                  _hover={{ opacity: 0.85 }}
                  onClick={handleDeleteConfirm}
                >
                  Удалить
                </chakra.button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </>
  )
}
