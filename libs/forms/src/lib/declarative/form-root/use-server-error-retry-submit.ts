import { type RefObject, useCallback } from 'react'
import type { AppFormApi } from '../types'

/** Снимает прошлый серверный отказ перед повторной отправкой, сохраняя клиентскую валидацию. */
export function useServerErrorRetrySubmit(
  form: AppFormApi,
  pendingSubmit: () => Promise<void>,
  serverSubmitErrorRef: RefObject<unknown>,
): () => Promise<void> {
  return useCallback(async () => {
    // Предыдущий отказ не должен блокировать повторную отправку до запуска валидаторов.
    if (serverSubmitErrorRef.current !== undefined && form.state.errorMap.onSubmit === serverSubmitErrorRef.current) {
      form.setErrorMap({ onSubmit: undefined })
    }
    serverSubmitErrorRef.current = undefined
    for (const name of Object.keys(form.state.fieldMeta)) {
      if (form.getFieldMeta(name)?.errorMap.onServer) {
        form.setFieldMeta(name, (meta: { errorMap: Record<string, unknown> }) => ({
          ...meta,
          errorMap: { ...meta.errorMap, onServer: undefined },
        }))
      }
    }
    await pendingSubmit()
  }, [form, pendingSubmit, serverSubmitErrorRef])
}
