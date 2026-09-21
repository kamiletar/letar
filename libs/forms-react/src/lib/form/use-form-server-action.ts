'use client'

import {
  ActionFailureError,
  applyServerErrors,
  isActionFailure,
  mapServerErrors,
} from '@letar/forms-core/server-errors'
import type { MappedServerErrors, MapServerErrorsConfig } from '@letar/forms-core/server-errors'
import type { RefObject } from 'react'
import { useState } from 'react'
import type { AppFormApi } from '../types'

/**
 * Минимальный контракт toaster-инстанса, нужный этому хуку — совпадает с тем, что отдаёт
 * `createAppToaster()` из `@letar/ui` (`toaster.create({ type, title })`), но не завязан на
 * конкретный импорт. Тот же приём уже был в самопальном `useServerActionForm` (domwellbes),
 * который этот хук заменяет.
 */
export interface FormServerActionToaster {
  create: (options: { type: 'error' | 'success'; title: string }) => void
}

export interface UseFormServerActionOptions extends MapServerErrorsConfig {
  /**
   * Toaster для async-фидбека. Опционален — без него единственный канал уведомления об ошибке
   * это `mapped.formErrors`, применённые к форме через `applyServerErrors` (нужен `<Form.Errors
   * />` в дереве, чтобы их увидеть).
   */
  toaster?: FormServerActionToaster
  /**
   * Сообщение об успехе для toaster. Без него `toaster.create({ type: 'success' })` не
   * вызывается — молчаливый успех тоже валиден (например когда за успехом сразу следует
   * `router.push`, и тост просто не успеет показаться).
   */
  successMessage?: string
}

export interface UseFormServerActionResult<TResult> {
  /** `true`, пока текущий вызов `run` не завершился. */
  pending: boolean
  /**
   * Выполняет `action`. При успехе — опциональный toaster.success + `onSuccess(result)`. При
   * ошибке — `mapServerErrors`/`applyServerErrors` кладут её на поля/форму через `formRef`,
   * опциональный toaster.error показывает то же сообщение, что легло в `formErrors` (или первое
   * сообщение поля, если `formErrors` пуст — например при `P2002` с попаданием в `fieldMap`), —
   * и только ПОСЛЕ этого исходная ошибка перебрасывается дальше.
   *
   * Перебрасывание обязательно (не косметика): декларативный `<Form>` делает
   * `commitPostSubmitReset` (сброс dirty/touched-состояния) сразу после того, как его `onSubmit`
   * резолвится без исключения — если бы `run` глотала ошибку, `<Form>` считал бы сабмит успешным
   * и стирала бы только что применённые через `applyServerErrors` field-level ошибки раньше, чем
   * пользователь успел бы их увидеть (найдено живой проверкой в браузере на `form-develop-app`,
   * не unit-тестами — `setFieldMeta` через мок формы в спеке не воспроизводит `<Form>`'s
   * post-submit reset). Вызывающему коду по-прежнему не нужен свой try/catch: `<Form>` сам ловит
   * исключение из `onSubmit` в этом же кадре (см. `form-simple.tsx`) — то же самое место, что уже
   * ловит `throw` из Server Action в низкоуровневом пути `middleware.onError`.
   *
   * Отказ, который Server Action вернула ЗНАЧЕНИЕМ (`actionFailure(...)` / `catchActionFailure`), тоже
   * считается ошибкой: `run` бросает `ActionFailureError`, а текст и поле (`field`) ложатся в форму
   * как у любой другой серверной ошибки. `onSuccess` и тост успеха при этом не вызываются. Значение
   * без маркера `success: false` (включая успех с полем `error`) отказом не считается.
   */
  run: <TData = TResult>(action: () => Promise<TData>, onSuccess?: (result: TData) => void) => Promise<TData>
}

function errorToastTitle(mapped: MappedServerErrors, defaultMessage?: string): string {
  if (mapped.formErrors.length > 0) {
    return mapped.formErrors.join('. ')
  }
  if (mapped.fieldErrors.length > 0) {
    return mapped.fieldErrors.map((fieldError) => fieldError.message).join(', ')
  }
  return defaultMessage ?? 'Произошла ошибка'
}

/**
 * Более лёгкий по ceremony путь к связке `formRef` + `middleware.onError` +
 * `mapServerErrors`/`applyServerErrors` + `<Form.Errors />` (см. `docs/server-errors.md` §«С
 * декларативным `<Form>`») — не новая возможность, а обёртка над уже существующим путём в один
 * вызов с pending-состоянием и опциональным toaster.
 *
 * Тот путь остаётся рабочим напрямую для тех, кому нужен полный контроль (например разное
 * поведение `onError` в зависимости от типа ошибки) — этот хук не заменяет его, а снимает
 * ceremony для типового случая: submit → pending → toast → field-level ошибки.
 *
 * @example
 * ```tsx
 * const formRef = useFormRef()
 * const { run, pending } = useFormServerAction(formRef, {
 *   fieldMap: { sku: { field: 'sku', message: 'Такой артикул уже используется' } },
 *   toaster: adminToaster,
 *   successMessage: 'Материал сохранён',
 * })
 *
 * <MyAppForm
 *   formRef={formRef}
 *   onSubmit={async (data) => {
 *     await run(() => createMaterial(data))
 *   }}
 * >
 *   <MyAppForm.Errors />
 *   ...
 *   <MyAppForm.Button.Submit loading={pending} />
 * </MyAppForm>
 * ```
 */
export function useFormServerAction<TResult = unknown>(
  formRef: RefObject<AppFormApi | null>,
  options: UseFormServerActionOptions = {},
): UseFormServerActionResult<TResult> {
  const [pending, setPending] = useState(false)
  const { toaster, successMessage, ...mapConfig } = options

  async function run<TData = TResult>(action: () => Promise<TData>, onSuccess?: (result: TData) => void) {
    setPending(true)
    try {
      const result = await action()
      // Отказ, возвращённый значением (Server Action не может бросить текст в production) —
      // превращаем в исключение здесь же: дальше он идёт тем же путём, что и `throw`
      if (isActionFailure(result)) {
        throw new ActionFailureError(result)
      }
      if (successMessage) {
        toaster?.create({ type: 'success', title: successMessage })
      }
      onSuccess?.(result)
      return result
    } catch (error) {
      const mapped = mapServerErrors(error, mapConfig)
      if (formRef.current) {
        applyServerErrors(formRef.current, mapped)
      }
      toaster?.create({ type: 'error', title: errorToastTitle(mapped, mapConfig.defaultMessage) })
      throw error
    } finally {
      setPending(false)
    }
  }

  return { pending, run }
}
