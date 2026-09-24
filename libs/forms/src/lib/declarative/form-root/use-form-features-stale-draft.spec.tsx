import { act, renderHook, waitFor } from '@testing-library/react'
import { useEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FormPersistenceConfig } from '../form-persistence'
import { useFormFeatures } from './use-form-features'

const KEY = 'stale-draft-test'
const STORAGE_KEY = `form-persistence:${KEY}`

type Values = { name: string; secret?: string }

/** Минимальная форма: стор с `subscribe` и текущими `state.values`, управляется вручную */
function createFakeForm(initialValues: Values) {
  let values = initialValues
  const listeners = new Set<() => void>()
  return {
    form: {
      store: {
        subscribe: (fn: () => void) => {
          listeners.add(fn)
          return () => {
            listeners.delete(fn)
          }
        },
      },
      get state() {
        return { values }
      },
    },
    setValues: (next: Values) => {
      values = next
      listeners.forEach((fn) => fn())
    },
    /** Шум стора без правок пользователя (монтирование, валидация, blur) */
    noise: () => {
      listeners.forEach((fn) => fn())
    },
  }
}

/** Повторяет порядок эффектов form-simple/form-with-api: подписка в эффекте после `useFormFeatures` */
function mountFeatures(
  form: ReturnType<typeof createFakeForm>['form'],
  persistence: Partial<FormPersistenceConfig> = {},
) {
  return renderHook(() => {
    const features = useFormFeatures<Values>({
      persistence: { key: KEY, debounceMs: 0, ...persistence },
      onlineSubmit: vi.fn().mockResolvedValue(undefined),
    })
    useEffect(() => features.subscribeToFormChanges(form), [features])
    return features
  })
}

function seedDraft(data: Values) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, savedAt: Date.now(), version: 1 }))
}

/**
 * Баг (domwellbes, 2026-09-24): правка → черновик записан → сабмит упал (черновик остался) →
 * пользователь вернул поле как было. Запись при `snapshot === baseline` пропускалась, но старый
 * черновик оставался в localStorage, и при следующем открытии формы вылезал диалог «Восстановить
 * сохранённые данные?» на данных, равных исходным.
 */
describe('useFormFeatures — устаревший черновик, равный исходным значениям', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('возврат значений к исходным удаляет ранее записанный черновик', async () => {
    const { form, setValues } = createFakeForm({ name: 'Исходное' })
    mountFeatures(form)

    act(() => {
      setValues({ name: 'Правка' })
    })
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toContain('Правка')
    })

    act(() => {
      setValues({ name: 'Исходное' })
    })
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
  })

  it('регрессия целиком: изменил → вернул → перемонтировал — диалога нет', async () => {
    const first = createFakeForm({ name: 'Исходное' })
    const view = mountFeatures(first.form)

    act(() => {
      first.setValues({ name: 'Правка' })
    })
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toContain('Правка')
    })
    act(() => {
      first.setValues({ name: 'Исходное' })
    })
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
    view.unmount()

    const second = createFakeForm({ name: 'Исходное' })
    const remounted = mountFeatures(second.form)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(remounted.result.current.persistenceResult.isDialogOpen).toBe(false)
    expect(remounted.result.current.persistenceResult.hasSavedData).toBe(false)
  })

  it('черновик, равный исходным значениям, при монтировании удаляется молча, без диалога', async () => {
    seedDraft({ name: 'Исходное' })
    const { form } = createFakeForm({ name: 'Исходное' })
    const { result } = mountFeatures(form)

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
    expect(result.current.persistenceResult.isDialogOpen).toBe(false)
    expect(result.current.persistenceResult.hasSavedData).toBe(false)
  })

  it('черновик, отличающийся от исходных значений, открывает диалог и переживает шум стора', async () => {
    seedDraft({ name: 'Черновик' })
    const { form, noise } = createFakeForm({ name: 'Исходное' })
    const { result } = mountFeatures(form)

    await waitFor(() => {
      expect(result.current.persistenceResult.isDialogOpen).toBe(true)
    })

    // Значения формы равны исходным, а черновик ещё не принят — удалять его нельзя
    act(() => {
      noise()
    })
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20))
    })
    expect(localStorage.getItem(STORAGE_KEY)).toContain('Черновик')
    expect(result.current.persistenceResult.isDialogOpen).toBe(true)
  })

  it('excludeFields не мешают сравнению: черновик без исключённого поля равен исходным значениям', async () => {
    seedDraft({ name: 'Исходное' })
    const { form } = createFakeForm({ name: 'Исходное', secret: 'пароль' })
    const { result } = mountFeatures(form, { excludeFields: ['secret'] })

    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    })
    expect(result.current.persistenceResult.isDialogOpen).toBe(false)
  })

  it('настоящая правка по-прежнему сохраняется как черновик', async () => {
    const { form, setValues } = createFakeForm({ name: 'Исходное' })
    mountFeatures(form)

    act(() => {
      setValues({ name: 'Правка' })
    })
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toContain('Правка')
    })
  })
})
