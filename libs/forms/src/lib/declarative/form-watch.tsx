'use client'

import { type ReactElement, useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { useFormGroup } from '../form-group'
import { useDeclarativeForm } from './form-context'
import type { FieldChangeApi } from './types'

/**
 * Props для компонента Form.Watch
 */
export interface FormWatchProps {
  /** Имя поля для отслеживания (относительно текущей группы) */
  field: string
  /** Callback при изменении значения поля */
  onChange: (value: unknown, api: FieldChangeApi) => void
}

/**
 * Получить вложенное значение из объекта по dot-path.
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let result: unknown = obj
  for (const part of parts) {
    if (result && typeof result === 'object') {
      result = (result as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return result
}

/**
 * Renderless компонент для отслеживания изменений поля внутри формы.
 *
 * Учитывает контекст FormGroup — если вложен в Group, путь резолвится
 * относительно группы (как у обычных полей).
 *
 * @example
 * ```tsx
 * <Form initialValue={{ name: '', slug: '' }} onSubmit={save}>
 *   <Form.Field.String name="name" label="Название" />
 *   <Form.Field.String name="slug" label="Slug" />
 *   <Form.Watch
 *     field="name"
 *     onChange={(value, { setFieldValue }) => {
 *       setFieldValue('slug', transliterate(String(value)))
 *     }}
 *   />
 *   <Form.Button.Submit>Сохранить</Form.Button.Submit>
 * </Form>
 * ```
 *
 * @example Внутри группы
 * ```tsx
 * <Form.Group name="address">
 *   <Form.Field.String name="country" />
 *   <Form.Field.String name="currency" />
 *   <Form.Watch
 *     field="country"
 *     onChange={(value, { setFieldValue }) => {
 *       setFieldValue('address.currency', getCurrency(String(value)))
 *     }}
 *   />
 * </Form.Group>
 * ```
 */
export function FormWatch({ field, onChange }: FormWatchProps): ReactElement | null {
  const { form } = useDeclarativeForm()
  const parentGroup = useFormGroup()

  // Полный путь с учётом группы
  const fullPath = parentGroup ? `${parentGroup.name}.${field}` : field

  // Ref для актуального callback (избегаем переподписки)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Подписка на store
  const subscribe = useCallback(
    (callback: () => void) => {
      const subscription = form.store.subscribe(callback)
      if (typeof subscription === 'function') {
        return subscription
      }
      return () => subscription.unsubscribe()
    },
    [form]
  )

  const getValueSnapshot = useCallback(
    () => getNestedValue(form.state.values as Record<string, unknown>, fullPath),
    [form, fullPath]
  )

  // Подписка на значение поля
  const value = useSyncExternalStore(subscribe, getValueSnapshot, getValueSnapshot)

  // Стабильный FieldChangeApi
  const fieldChangeApi = useMemo<FieldChangeApi>(
    () => ({
      setFieldValue: (name: string, val: unknown) => {
        form.setFieldValue(name, val)
      },
      getFieldValue: (name: string) => {
        return getNestedValue(form.state.values as Record<string, unknown>, name)
      },
      getValues: () => {
        return form.state.values as Record<string, unknown>
      },
    }),
    [form]
  )

  // Предыдущее значение для детекции изменений
  const prevValueRef = useRef(value)
  const isFirstRender = useRef(true)

  useEffect(() => {
    // Пропускаем первый рендер — начальное значение не является "изменением"
    if (isFirstRender.current) {
      isFirstRender.current = false
      prevValueRef.current = value
      return
    }

    if (!Object.is(prevValueRef.current, value)) {
      prevValueRef.current = value
      onChangeRef.current(value, fieldChangeApi)
    }
  }, [value, fieldChangeApi])

  return null
}
