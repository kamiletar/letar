'use client'

import { chakra, IconButton } from '@chakra-ui/react'
import {
  type SelectionCreateButtonProps,
  type SelectionEditButtonProps,
  useSelectionCreateButton,
  useSelectionEditButton,
} from '@letar/forms-react'
import { LuPencil } from 'react-icons/lu'

/**
 * Карандаш «Изменить» у пункта списка или у выбранного значения. Рисуется только внутри поля
 * Select/Combobox с `onUpdate`; логика (гашение событий, `disabled`, `aria-*`) — в `@letar/forms-react`.
 */
export function SelectEditButton({ children, asChild, ...props }: SelectionEditButtonProps) {
  const state = useSelectionEditButton(props)
  if (!state) {
    return null
  }
  const inList = state.scope === 'option'

  return (
    <IconButton
      asChild={asChild}
      type="button"
      size="2xs"
      variant="ghost"
      aria-label={state['aria-label']}
      aria-hidden={state['aria-hidden']}
      title={state.title}
      tabIndex={state.tabIndex}
      disabled={state.disabled}
      onClick={state.onClick}
      onPointerDown={state.onPointerDown}
      onPointerUp={state.onPointerUp}
      onKeyDown={state.onKeyDown}
      data-part="edit-button"
      // В списке карандаш виден на подсвеченном пункте (и всегда на устройствах без hover)
      css={inList
        ? {
          marginInlineStart: 'auto',
          '@media (hover: hover) and (pointer: fine)': { opacity: 0, visibility: 'hidden' },
          '[data-highlighted] > &, [data-highlighted] &': { opacity: 1, visibility: 'visible' },
        }
        : undefined}
    >
      {asChild ? children : children ?? <LuPencil />}
    </IconButton>
  )
}

/** Кнопка «+ Добавить…» — в `listFooter` или в своём `renderOption` */
export function SelectCreateButton({ children, asChild }: SelectionCreateButtonProps) {
  const state = useSelectionCreateButton()
  if (!state) {
    return null
  }

  return (
    <chakra.button
      asChild={asChild}
      type="button"
      display="flex"
      alignItems="center"
      width="100%"
      px={2}
      py={1.5}
      textAlign="start"
      cursor="pointer"
      disabled={state.disabled}
      onClick={state.onClick}
      onPointerDown={state.onPointerDown}
      onKeyDown={state.onKeyDown}
      _hover={{ bg: 'bg.muted' }}
      _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
    >
      {asChild ? children : children ?? state.label}
    </chakra.button>
  )
}
