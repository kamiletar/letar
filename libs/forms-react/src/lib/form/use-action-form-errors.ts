'use client'

import { applyServerErrors, mapServerErrors } from '@letar/forms-core/server-errors'
import type { MapServerErrorsConfig } from '@letar/forms-core/server-errors'
import { useEffect, useMemo, useRef } from 'react'
import type { AppFormApi } from '../types'

/**
 * Показ причины отказа Server Action в форме через `middleware.onError` — низкоуровневый путь,
 * когда `useFormServerAction.run` не нужен (нет pending/toaster).
 *
 * `ActionFailureError` (из `unwrapActionResult`) кладётся под своё поле (если есть) и в общий блок
 * `<Form.Errors />`; прочие ошибки разбирает `mapServerErrors`. `<Form.Errors />` обязателен: без
 * него отказ без поля (общий) нигде не виден.
 *
 * @example
 * ```tsx
 * const { formRef, middleware } = useActionFormErrors()
 *
 * <MyAppForm
 *   formRef={formRef}
 *   middleware={middleware}
 *   onSubmit={async (data) => {
 *     unwrapActionResult(await createMaterial(data))
 *   }}
 * >
 *   <MyAppForm.Errors />
 * </MyAppForm>
 * ```
 */
export function useActionFormErrors(config?: MapServerErrorsConfig) {
  const formRef = useRef<AppFormApi | null>(null)
  // Свежий config без пересоздания middleware: литерал `fieldMap` в JSX меняется каждый рендер
  const configRef = useRef(config)
  useEffect(() => {
    configRef.current = config
  })

  const middleware = useMemo(() => ({
    onError: (error: Error) => {
      if (formRef.current) {
        applyServerErrors(formRef.current, mapServerErrors(error, configRef.current))
      }
    },
  }), [])

  return { formRef, middleware }
}
