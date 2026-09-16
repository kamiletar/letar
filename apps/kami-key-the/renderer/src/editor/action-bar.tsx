/**
 * Нижняя панель редактора — статус сохранения, undo/redo, сброс, сохранение
 *
 * Заменяет toolbar.tsx: экспорт/импорт переехали в меню «⋯» вкладки (layout-tabs.tsx),
 * счётчик позиции undo/redo убран — статус «есть несохранённые изменения» важнее.
 */

import { chakra, Flex, IconButton, Kbd, Text } from '@chakra-ui/react'
import { Tooltip } from '@letar/ui'
import { LuCircleCheck, LuRedo2, LuRotateCcw, LuUndo2 } from 'react-icons/lu'

interface ActionBarProps {
  isDirty: boolean
  canUndo: boolean
  canRedo: boolean
  onSave: () => void
  onReset: () => void
  onUndo: () => void
  onRedo: () => void
}

export function ActionBar({ isDirty, canUndo, canRedo, onSave, onReset, onUndo, onRedo }: ActionBarProps) {
  return (
    <Flex
      align="center"
      wrap="wrap"
      gap="3"
      rowGap="2"
      minH="56px"
      py="2"
      px="5"
      flexShrink={0}
      bg="bg.subtle"
      borderTopWidth="1px"
      borderColor="border.subtle"
    >
      <Flex align="center" gap="2" flex="1" minW="120px">
        {isDirty
          ? (
            <>
              <chakra.span w="8px" h="8px" rounded="full" bg="fg.warning" flexShrink={0} />
              <Text fontSize="sm" color="fg.warning" truncate>
                Есть несохранённые изменения
              </Text>
            </>
          )
          : (
            <>
              <LuCircleCheck size={16} color="var(--chakra-colors-fg-subtle)" />
              <Text fontSize="sm" color="fg.subtle" truncate>
                Все изменения сохранены
              </Text>
            </>
          )}
      </Flex>

      <Tooltip content="Отменить · Ctrl+Z">
        <IconButton aria-label="Отменить" size="sm" variant="ghost" disabled={!canUndo} onClick={onUndo}>
          <LuUndo2 size={16} />
        </IconButton>
      </Tooltip>
      <Tooltip content="Повторить · Ctrl+Y">
        <IconButton aria-label="Повторить" size="sm" variant="ghost" disabled={!canRedo} onClick={onRedo}>
          <LuRedo2 size={16} />
        </IconButton>
      </Tooltip>

      <chakra.button
        type="button"
        display="flex"
        alignItems="center"
        gap="1.5"
        px="3"
        h="8"
        rounded="l2"
        fontSize="sm"
        color="fg.muted"
        flexShrink={0}
        _hover={{ bg: 'bg.muted' }}
        _disabled={{ opacity: 0.4, cursor: 'default' }}
        disabled={!isDirty}
        onClick={onReset}
      >
        <LuRotateCcw size={14} />
        Отменить все правки
      </chakra.button>

      <chakra.button
        type="button"
        display="flex"
        alignItems="center"
        gap="2"
        px="4"
        h="8"
        rounded="l2"
        fontSize="sm"
        fontWeight="600"
        bg="brand.solid"
        color="brand.contrast"
        flexShrink={0}
        _hover={{ bg: 'brand.emphasized' }}
        _disabled={{ opacity: 0.5, cursor: 'default' }}
        disabled={!isDirty}
        onClick={onSave}
      >
        Сохранить
        <Kbd size="sm">Ctrl+S</Kbd>
      </chakra.button>
    </Flex>
  )
}
