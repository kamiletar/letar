import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFormFeatures } from './use-form-features'

const KEY = 'post-submit-persistence-baseline-test'
const STORAGE_KEY = `form-persistence:${KEY}`

/**
 * Минимальная реализация формы, которую ожидает `subscribeToFormChanges`: стор с `subscribe`
 * и текущими `state.values`. Управляем ею вручную, чтобы отделить проверку от TanStack Form
 * (у него своя, отдельная от этого бага, ловушка отката к устаревшему `initialValue` —
 * `usePostSubmitResetGuard` и `letar-forms-post-submit-reset-stale-initialvalue.md`).
 */
function createFakeForm<TData>(initialValues: TData) {
  let values = initialValues
  let listener: (() => void) | null = null
  return {
    form: {
      store: {
        subscribe: (fn: () => void) => {
          listener = fn
          return () => {
            listener = null
          }
        },
      },
      get state() {
        return { values }
      },
    },
    setValues: (next: TData) => {
      values = next
      listener?.()
    },
  }
}

/**
 * Баг (domwellbes, NIGHT_QUEUE_2026-09-22 §B3): `handleSubmit()` чистит черновик
 * (`clearSavedData()`), но библиотека следом сама вызывает `form.reset(dataToSubmit)`
 * (`usePostSubmitResetGuard`/`commitPostSubmitReset`). Уведомление стора от этого `reset()`
 * не совпадало с baseline-снимком, взятым один раз при монтировании, — guard в
 * `subscribeToFormChanges` пропускал его как «настоящую правку» и debounced-запись писала
 * только что отправленные данные обратно в тот же localStorage-ключ. Форма не размонтируется
 * сразу после сабмита (типичная незавершённая навигация) — при следующем открытии показывался
 * ложный диалог восстановления на данных, которые уже сохранены на сервере.
 * @see /.claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md
 */
describe('useFormFeatures — успешный сабмит не пишет черновик заново после clearSavedData()', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('уведомление от post-submit reset() с отправленными данными не воскрешает черновик', async () => {
    const { form, setValues } = createFakeForm({ name: 'Исходное' })
    const onlineSubmit = vi.fn().mockResolvedValue(undefined)

    const { result } = renderHook(() =>
      useFormFeatures<{ name: string }>({
        persistence: { key: KEY, debounceMs: 0 },
        onlineSubmit,
      })
    )

    act(() => {
      result.current.subscribeToFormChanges(form)
    })

    // Реальная правка пользователя — сохраняется как обычно
    act(() => {
      setValues({ name: 'Исходное плюс' })
    })
    await waitFor(() => {
      expect(localStorage.getItem(STORAGE_KEY)).toContain('Исходное плюс')
    })

    // Успешный сабмит — clearSavedData() чистит черновик синхронно
    await act(async () => {
      await result.current.handleSubmit({ name: 'Исходное плюс' })
    })
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(onlineSubmit).toHaveBeenCalledWith({ name: 'Исходное плюс' })

    // Библиотека сама вызывает form.reset(dataToSubmit) после handleSubmit — стор уведомляет
    // подписчиков теми же данными, что были только что отправлены и очищены
    act(() => {
      setValues({ name: 'Исходное плюс' })
    })

    // Debounce (0мс) — если баг не починен, здесь черновик воскресает
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })
})
