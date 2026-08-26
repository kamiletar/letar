'use client'

import { type EditIntentValue, emptyEditIntentValue } from '@letar/forms-core/edit-intent'
import { useStore } from '@tanstack/react-form'
import { useCallback, useEffect, useRef } from 'react'
import type { AppFormApi } from '../types'

export interface UseEditIntentFieldOptions<T> {
  /** Экземпляр формы — читается реактивно через `useStore(form.store, ...)`, пишется через `setFieldValue`. */
  form: AppFormApi
  /** Полный путь поля (например, "apiKey" или "settings.apiKey"). */
  fullPath: string
  /** Значение, с которого стартует дочернее поле при входе в edit mode. */
  emptyValue: T
}

export interface UseEditIntentFieldResult {
  /** `true`, пока значение не заменено — показывается `displayValue`, дочернее поле скрыто. */
  isViewMode: boolean
  /** Переводит поле в edit mode: `isEdited: true`, `value` — `emptyValue`. */
  startEdit: () => void
  /** Возвращает поле в view mode: `isEdited: false`, `value: null` — дочерний ввод очищается. */
  cancelEdit: () => void
  /**
   * Вешается на контейнер дочернего поля. При входе в edit mode переводит фокус на первый
   * фокусируемый элемент внутри (`input`/`textarea`/`select`) — headless, не завязан на то,
   * какой UIKit рисует дочернее поле.
   */
  editableContainerRef: (element: HTMLElement | null) => void
  /** Вешается на кнопку «Заменить» — получает фокус обратно после отмены. */
  triggerButtonRef: (element: HTMLButtonElement | null) => void
}

const FOCUSABLE_SELECTOR = 'input, textarea, select, [contenteditable="true"]'

/** Точечно резолвит `a.b.c` в объекте формы — тот же дот-путь, которым `form.setFieldValue` уже адресует вложенные значения. */
function getByPath(source: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') {
      return undefined
    }
    return (acc as Record<string, unknown>)[key]
  }, source)
}

/**
 * Headless view/edit-контракт для `Form.Field.EditIntent` (Chakra/shadcn/Vue/Angular —
 * реализация одна, скины только рисуют кнопки и дочернее поле).
 *
 * Подписывается на значение поля реактивно через `useStore(form.store, ...)`, а не через
 * `field.state.value` из render-prop `<form.Field>` — тот вызывается TanStack Form изнутри
 * своего собственного `useMemo`, и хуки там недопустимы ("Do not call Hooks inside useEffect,
 * useMemo, ..."). Поэтому этот хук предназначен для вызова из `useFieldState` (верхний уровень
 * компонента, до `<form.Field>`), как и описано в `FieldStateContext` (`create-field-primitives.tsx`).
 *
 * `isEdited` — пользовательский intent, не производная от `isDirty`: старый secret намеренно
 * неизвестен клиенту, сравнивать значения не с чем. `startEdit`/`cancelEdit` — единственные два
 * перехода состояния, оба атомарны (меняют и `isEdited`, и `value` одним `setFieldValue`), чтобы
 * форма не оказывалась на мгновение в противоречивом `{isEdited: true, value: null}`.
 */
export function useEditIntentField<T>(options: UseEditIntentFieldOptions<T>): UseEditIntentFieldResult {
  const { form, fullPath, emptyValue } = options

  const value = (useStore(form.store, (state: { values: unknown }) => getByPath(state.values, fullPath)) as
    | EditIntentValue<T>
    | undefined) ?? emptyEditIntentValue<T>()
  const isViewMode = !value.isEdited

  const containerElRef = useRef<HTMLElement | null>(null)
  const triggerElRef = useRef<HTMLButtonElement | null>(null)
  const pendingFocusRef = useRef<'edit' | 'view' | null>(null)

  const editableContainerRef = useCallback((element: HTMLElement | null) => {
    containerElRef.current = element
  }, [])

  const triggerButtonRef = useCallback((element: HTMLButtonElement | null) => {
    triggerElRef.current = element
  }, [])

  const startEdit = useCallback(() => {
    form.setFieldValue(fullPath, { isEdited: true, value: emptyValue })
    pendingFocusRef.current = 'edit'
  }, [form, fullPath, emptyValue])

  const cancelEdit = useCallback(() => {
    form.setFieldValue(fullPath, { isEdited: false, value: null })
    pendingFocusRef.current = 'view'
  }, [form, fullPath])

  // Перевод фокуса — эффектом после реального изменения value/DOM, не синхронно в обработчике
  // клика: дочернее поле (view↔edit) монтируется/размонтируется вместе со сменой mode.
  useEffect(() => {
    if (pendingFocusRef.current === 'edit' && !isViewMode) {
      containerElRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR)?.focus()
      pendingFocusRef.current = null
    } else if (pendingFocusRef.current === 'view' && isViewMode) {
      triggerElRef.current?.focus()
      pendingFocusRef.current = null
    }
  }, [isViewMode])

  return { isViewMode, startEdit, cancelEdit, editableContainerRef, triggerButtonRef }
}
