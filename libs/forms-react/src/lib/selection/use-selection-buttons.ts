'use client'

import type { KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from 'react'
import { useSelectionActions, useSelectionOption } from './selection-context'

export interface SelectionEditButtonProps {
  /** Своя иконка/текст; по умолчанию карандаш скина. С `asChild` — свой элемент, получит обработчики и `aria-*` */
  children?: ReactNode
  /** Отрисовать единственного ребёнка вместо кнопки скина (как `asChild` у компонентов Chakra) */
  asChild?: boolean
  /** По умолчанию «Изменить «<текст опции>»» */
  'aria-label'?: string
  /** По умолчанию «Изменить» (i18n `formSelection.editOption`) */
  title?: string
}

export interface SelectionCreateButtonProps {
  /** По умолчанию «+ Добавить…» у Select и «+ Добавить "<поиск>"» у Combobox */
  children?: ReactNode
  /** Отрисовать единственного ребёнка вместо кнопки скина (как `asChild` у компонентов Chakra) */
  asChild?: boolean
}

export interface SelectionEditButtonState {
  scope: 'option' | 'value'
  disabled: boolean
  tabIndex: number | undefined
  'aria-hidden': true | undefined
  'aria-label': string
  title: string
  onClick: (event: MouseEvent) => void
  onPointerDown: (event: PointerEvent) => void
  onPointerUp: (event: PointerEvent) => void
  onKeyDown: (event: KeyboardEvent) => void
}

export interface SelectionCreateButtonState {
  disabled: boolean
  label: string
  onClick: (event: MouseEvent) => void
  onPointerDown: (event: PointerEvent) => void
  onKeyDown: (event: KeyboardEvent) => void
}

const warned = new Set<string>()

/** Dev-предупреждение: один раз на причину. Решение «прод или нет» здесь не принимается — только диагностика */
function warnOnce(key: string, message: string): void {
  const env = process.env.NODE_ENV
  if ((env !== 'development' && env !== 'test') || warned.has(key)) {
    return
  }
  warned.add(key)
  console.warn(`[@letar/forms] ${message}`)
}

/** Только для тестов: сбросить «уже предупреждали» */
export function resetSelectionButtonWarnings(): void {
  warned.clear()
}

const stop = (event: { stopPropagation: () => void }) => event.stopPropagation()

/** Enter/Space на кнопке в списке не должны превращаться в выбор подсвеченного пункта */
const stopActivationKeys = (event: KeyboardEvent) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.stopPropagation()
  }
}

/**
 * Headless-логика `EditButton`: видимость, `disabled`, обработчики событий. `null` — кнопку не рисовать.
 * Гашение событий (`stopPropagation`) здесь одно на оба скина: карандаш пункта не должен выбирать пункт.
 */
export function useSelectionEditButton(props: SelectionEditButtonProps): SelectionEditButtonState | null {
  const actions = useSelectionActions()
  const item = useSelectionOption()

  if (!actions || !item) {
    warnOnce(
      'edit-outside',
      'Select.EditButton is used outside a Select/Combobox field or an option — rendered nothing',
    )
    return null
  }
  if (item.scope === 'value-text') {
    warnOnce(
      'edit-in-trigger',
      'Select.EditButton inside `renderValue` is not allowed (the trigger is a <button>) — rendered nothing',
    )
    return null
  }
  if (!actions.hasOnUpdate) {
    warnOnce('edit-no-onupdate', 'Select.EditButton needs `onUpdate` on the field — rendered nothing')
    return null
  }
  if (!item.editable || !actions.interactive) {
    return null
  }

  const scope = item.scope
  const inList = scope === 'option'
  return {
    scope,
    disabled: actions.pending,
    // В пункте карандаш вне Tab-порядка и скрыт от AT: иначе фокус при открытии прыгнет на него, а Enter выберет пункт
    tabIndex: inList ? -1 : undefined,
    'aria-hidden': inList ? true : undefined,
    'aria-label': props['aria-label'] ?? actions.strings.editAria(item.text),
    title: props.title ?? actions.strings.edit,
    onPointerDown: inList ? stop : () => undefined,
    onPointerUp: inList ? stop : () => undefined,
    onKeyDown: stopActivationKeys,
    onClick: (event) => {
      event.stopPropagation()
      event.preventDefault()
      actions.runEdit(item.option, scope)
    },
  }
}

/** Headless-логика `CreateButton`. `null` — кнопку не рисовать */
export function useSelectionCreateButton(): SelectionCreateButtonState | null {
  const actions = useSelectionActions()
  const item = useSelectionOption()

  if (!actions) {
    warnOnce('create-outside', 'Select.CreateButton is used outside a Select/Combobox field — rendered nothing')
    return null
  }
  if (item?.scope === 'value-text' || !actions.canCreate || !actions.interactive) {
    return null
  }
  return {
    disabled: actions.pending,
    label: actions.search ? actions.strings.createWithSearch(actions.search) : actions.strings.create,
    onPointerDown: stop,
    onKeyDown: stopActivationKeys,
    onClick: (event) => {
      event.stopPropagation()
      event.preventDefault()
      actions.runCreate()
    },
  }
}
