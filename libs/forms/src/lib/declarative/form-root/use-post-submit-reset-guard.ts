'use client'

import { deepEqual } from '@letar/forms-core/utils'
import { useEffect, useRef } from 'react'
import type { AppFormApi } from '../types'

/**
 * Защита от отката формы к устаревшему `initialValue` сразу после успешного сабмита.
 *
 * `formApi.reset(dataToSubmit)` снимает `state.isTouched` — на следующем рендере TanStack Form
 * (`useForm`'s layout effect → `FormApi.update()`) синхронизирует `state.values` с ЛЮБЫМ новым
 * `defaultValues`, который родитель передаёт в `useAppForm`, если форма не touched. Если родитель
 * вычисляет `initialValue` как статический дефолт, а не как «то, что реально было отправлено» —
 * это тихо перетирает поле обратно.
 *
 * Здесь мы запоминаем отправленное значение и на следующем рендере (после того, как TanStack
 * успел применить чужой `defaultValues`) сверяем `state.values` с ним. При расхождении —
 * восстанавливаем именно отправленные данные, ровно один раз.
 *
 * @see /.claude/docs/letar-forms-post-submit-reset-stale-initialvalue.md
 */
export function usePostSubmitResetGuard<TData>(
  form: AppFormApi,
  watchedDefaultValues: unknown,
): { commitPostSubmitReset: (dataToSubmit: TData) => void } {
  const lastSubmittedRef = useRef<TData | null>(null)

  useEffect(() => {
    if (lastSubmittedRef.current === null) {
      return
    }
    const submitted = lastSubmittedRef.current
    lastSubmittedRef.current = null

    if (!form.state.isTouched && !deepEqual(form.state.values, submitted)) {
      form.reset(submitted)
    }
    // watchedDefaultValues — единственная реальная зависимость: эффект должен перепроверить
    // состояние формы на каждом рендере, где родитель мог передать новый initialValue.
  }, [watchedDefaultValues])

  return {
    commitPostSubmitReset: (dataToSubmit: TData) => {
      form.reset(dataToSubmit)
      lastSubmittedRef.current = dataToSubmit
    },
  }
}
