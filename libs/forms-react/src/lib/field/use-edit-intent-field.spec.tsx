import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useEditIntentField } from './use-edit-intent-field'

/** Записывает значение по дот-пути в новый объект (иммутабельно), тем же путём, что читает `getByPath` хука. */
function setNestedPath(source: Record<string, unknown>, path: string, next: unknown): Record<string, unknown> {
  const [key, ...rest] = path.split('.')
  if (rest.length === 0) {
    return { ...source, [key]: next }
  }
  const child = (source[key] as Record<string, unknown> | undefined) ?? {}
  return { ...source, [key]: setNestedPath(child, rest.join('.'), next) }
}

/**
 * Мини-эмулятор `AppFormApi` — ровно тот минимум, которым пользуется хук: `store.get()`/
 * `store.subscribe()`/`setFieldValue`. Форма `subscribe` (возвращает `{unsubscribe}`, не саму
 * функцию) и `get()` (не `.state`) — контракт `@tanstack/react-store` `useSelector`, на котором
 * держится `useStore` из `@tanstack/react-form`.
 */
function createFakeForm(initialValues: Record<string, unknown>) {
  let values = initialValues
  const listeners = new Set<() => void>()

  const store = {
    get: () => ({ values }),
    subscribe: (listener: () => void) => {
      listeners.add(listener)
      return { unsubscribe: () => listeners.delete(listener) }
    },
  }

  return {
    store,
    setFieldValue: (path: string, next: unknown) => {
      values = setNestedPath(values, path, next)
      listeners.forEach((l) => l())
    },
    getValues: () => values,
  }
}

describe('useEditIntentField', () => {
  it('стартует в view mode для isEdited: false', () => {
    const form = createFakeForm({ apiKey: { isEdited: false, value: null } })
    const { result } = renderHook(() => useEditIntentField({ form, fullPath: 'apiKey', emptyValue: '' }))
    expect(result.current.isViewMode).toBe(true)
  })

  it('стартует в edit mode для isEdited: true (create mode)', () => {
    const form = createFakeForm({ apiKey: { isEdited: true, value: 'x' } })
    const { result } = renderHook(() => useEditIntentField({ form, fullPath: 'apiKey', emptyValue: '' }))
    expect(result.current.isViewMode).toBe(false)
  })

  it('без значения в форме (undefined) считает view mode стартовым', () => {
    const form = createFakeForm({})
    const { result } = renderHook(() => useEditIntentField({ form, fullPath: 'apiKey', emptyValue: '' }))
    expect(result.current.isViewMode).toBe(true)
  })

  it('startEdit атомарно пишет {isEdited: true, value: emptyValue} через setFieldValue', () => {
    const form = createFakeForm({ apiKey: { isEdited: false, value: null } })
    const { result } = renderHook(() => useEditIntentField({ form, fullPath: 'apiKey', emptyValue: '' }))

    act(() => {
      result.current.startEdit()
    })

    expect(form.getValues().apiKey).toEqual({ isEdited: true, value: '' })
  })

  it('cancelEdit атомарно пишет {isEdited: false, value: null} через setFieldValue', () => {
    const form = createFakeForm({ apiKey: { isEdited: true, value: 'sk_live_x' } })
    const { result } = renderHook(() => useEditIntentField({ form, fullPath: 'apiKey', emptyValue: '' }))

    act(() => {
      result.current.cancelEdit()
    })

    expect(form.getValues().apiKey).toEqual({ isEdited: false, value: null })
  })

  it('после startEdit хук реактивно переходит в edit mode (без ручного rerender)', () => {
    const form = createFakeForm({ apiKey: { isEdited: false, value: null } })
    const { result } = renderHook(() => useEditIntentField({ form, fullPath: 'apiKey', emptyValue: '' }))

    act(() => {
      result.current.startEdit()
    })

    expect(result.current.isViewMode).toBe(false)
  })

  it('после реального перехода в edit mode переводит фокус на первый фокусируемый элемент контейнера', () => {
    const container = document.createElement('div')
    const input = document.createElement('input')
    container.appendChild(input)
    document.body.appendChild(container)

    const form = createFakeForm({ apiKey: { isEdited: false, value: null } })
    const { result } = renderHook(() => useEditIntentField({ form, fullPath: 'apiKey', emptyValue: '' }))

    act(() => {
      result.current.editableContainerRef(container)
      result.current.startEdit()
    })

    expect(document.activeElement).toBe(input)

    document.body.removeChild(container)
  })

  it('после реального перехода в view mode возвращает фокус на кнопку-триггер', () => {
    const button = document.createElement('button')
    document.body.appendChild(button)

    const form = createFakeForm({ apiKey: { isEdited: true, value: 'sk_live_x' } })
    const { result } = renderHook(() => useEditIntentField({ form, fullPath: 'apiKey', emptyValue: '' }))

    act(() => {
      result.current.triggerButtonRef(button)
      result.current.cancelEdit()
    })

    expect(document.activeElement).toBe(button)

    document.body.removeChild(button)
  })

  it('поддерживает вложенный dot-путь (settings.apiKey)', () => {
    const form = createFakeForm({ settings: { apiKey: { isEdited: false, value: null } } })
    const { result } = renderHook(() => useEditIntentField({ form, fullPath: 'settings.apiKey', emptyValue: '' }))

    expect(result.current.isViewMode).toBe(true)

    act(() => {
      result.current.startEdit()
    })

    expect(form.getValues().settings).toEqual({ apiKey: { isEdited: true, value: '' } })
  })
})
