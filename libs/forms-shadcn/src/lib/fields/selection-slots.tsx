'use client'

import {
  type SelectionCreateButtonProps,
  type SelectionEditButtonProps,
  useSelectionCreateButton,
  useSelectionEditButton,
} from '@letar/forms-react'
import { cn } from '@letar/tailwind-utils'
import { Pencil } from 'lucide-react'
import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'

/** `asChild`: единственный ребёнок получает свойства кнопки (как `Slot` у Radix, без лишней зависимости) */
function renderAs(
  asChild: boolean | undefined,
  children: ReactNode,
  fallback: ReactNode,
  props: Record<string, unknown>,
  tag: 'button',
): ReactElement {
  if (asChild && isValidElement(children)) {
    return cloneElement(children as ReactElement<Record<string, unknown>>, props)
  }
  const Tag = tag
  return <Tag {...props}>{children ?? fallback}</Tag>
}

/**
 * Карандаш «Изменить» у пункта списка или у выбранного значения. Рисуется только внутри поля
 * Select/Combobox с `onUpdate`; логика (гашение событий, `disabled`, `aria-*`) — в `@letar/forms-react`.
 */
export function SelectEditButton({ children, asChild, ...props }: SelectionEditButtonProps): ReactElement | null {
  const state = useSelectionEditButton(props)
  if (!state) {
    return null
  }
  const inList = state.scope === 'option'

  return renderAs(asChild, children, <Pencil className="size-3.5" />, {
    type: 'button',
    'data-part': 'edit-button',
    'aria-label': state['aria-label'],
    'aria-hidden': state['aria-hidden'],
    title: state.title,
    tabIndex: state.tabIndex,
    disabled: state.disabled,
    onClick: state.onClick,
    onPointerDown: state.onPointerDown,
    onPointerUp: state.onPointerUp,
    onKeyDown: state.onKeyDown,
    className: cn(
      'text-muted-foreground hover:text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-sm outline-none',
      'focus-visible:ring-ring/50 focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50',
      // В списке карандаш виден на подсвеченном пункте (и всегда на устройствах без hover)
      inList
        && 'ml-auto opacity-0 group-hover/item:opacity-100 group-data-[highlighted]/item:opacity-100 [@media(hover:none)]:opacity-100',
    ),
  }, 'button')
}

/** Кнопка «+ Добавить…» — в `listFooter`, `renderEmpty` или в своём `renderOption` */
export function SelectCreateButton({ children, asChild }: SelectionCreateButtonProps): ReactElement | null {
  const state = useSelectionCreateButton()
  if (!state) {
    return null
  }

  return renderAs(asChild, children, state.label, {
    type: 'button',
    disabled: state.disabled,
    onClick: state.onClick,
    onPointerDown: state.onPointerDown,
    onKeyDown: state.onKeyDown,
    className: cn(
      'hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-1.5 text-start text-sm outline-none',
      'disabled:cursor-not-allowed disabled:opacity-50',
    ),
  }, 'button')
}
