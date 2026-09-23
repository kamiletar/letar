'use client'

import { deepEqual } from '@letar/forms-core/utils'
import { useEffect, useRef } from 'react'
import type { AppFormApi } from '../types'

/**
 * Защита от отката формы к устаревшему `initialValue` сразу после успешного сабмита.
 *
 * `formApi.reset(dataToSubmit)` снимает `state.isTouched`. Без второго аргумента `reset()` ещё и
 * перезаписывает `this.options.defaultValues = dataToSubmit` (`@tanstack/form-core`,
 * `FormApi.reset`). На КАЖДОМ следующем рендере (`useForm`'s layout effect без deps →
 * `formApi.update(opts)`) TanStack сравнивает текущий `options.defaultValues` (проп
 * `initialValue`, вычисленный при этом рендере) с этим перезаписанным значением — не с прошлым
 * рендером React. Если `initialValue`, который вычисляет родитель, не совпадает по значению с
 * `dataToSubmit` (типично — статический дефолт вместо мемоизации с учётом отправленных данных) и
 * форма ещё не touched — `update()` тихо перетирает `state.values` обратно к `initialValue`. Это
 * происходит на КАЖДОМ следующем рендере, а не один раз — `reset()` без опций создаёт постоянный
 * источник рассинхрона между тем, что реально отправлено, и тем, что форма считает «дефолтом».
 *
 * Фикс — `{ keepDefaultValues: true }`: `reset()` очищает dirty-состояние (`isTouched`,
 * `isDirty`) и подставляет `dataToSubmit` в `state.values`, но НЕ трогает
 * `this.options.defaultValues` — он остаётся тем, чем был до сабмита (актуальным `initialValue`
 * на тот момент). На следующем рендере `update()` сравнивает `opts.defaultValues` с этим же
 * значением — совпадение по построению, `shouldUpdateValues` не срабатывает, отката не
 * происходит вовсе. Легитимные будущие изменения `initialValue`/`defaultValues` (например,
 * перезагруженные данные записи в `FormWithApi`) синхронизируются `update()` как обычно — этот
 * фикс их не блокирует, он устраняет только рассинхрон, который создавал наш же `reset()`.
 *
 * Корректирующий `useEffect` ниже остаётся как защита от края (например, если приложение само
 * вызывает `form.reset()` без `keepDefaultValues` между сабмитом и следующим рендером) —
 * НАМЕРЕННО без dependency array, перепроверяет состояние на каждом рендере, а не только при
 * смене ссылки `initialValue`: ре-рендер со стабильной ссылкой (например от `clearSavedData()`'ов
 * `setState` внутри `useFormPersistence`) откатывает `state.values` тем же путём, что и смена
 * ссылки, и эффект с зависимостью только от `initialValue` такой рендер пропускал.
 *
 * @see /.claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md
 */
export function usePostSubmitResetGuard<TData>(
  form: AppFormApi,
): { commitPostSubmitReset: (dataToSubmit: TData) => void } {
  const lastSubmittedRef = useRef<TData | null>(null)

  useEffect(() => {
    if (lastSubmittedRef.current === null) {
      return
    }
    const submitted = lastSubmittedRef.current
    lastSubmittedRef.current = null

    if (!form.state.isTouched && !deepEqual(form.state.values, submitted)) {
      form.reset(submitted, { keepDefaultValues: true })
    }
  })

  return {
    commitPostSubmitReset: (dataToSubmit: TData) => {
      form.reset(dataToSubmit, { keepDefaultValues: true })
      lastSubmittedRef.current = dataToSubmit
    },
  }
}
