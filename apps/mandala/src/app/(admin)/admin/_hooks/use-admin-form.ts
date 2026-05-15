'use client'

import { toaster } from '@/app/_components/ui/toaster'
import { useCallback, useMemo } from 'react'
import { createFormPersistence } from '../_helpers'

/** Результат действия формы */
export interface FormActionResult {
  success: boolean
  error?: string
  field?: string
}

/** Опции хука useAdminForm */
export interface UseAdminFormOptions<TEntity, TFormInput> {
  /** Ключ сущности для persistence (например: 'mandala', 'product') */
  entityKey: string
  /** Существующая сущность (null для создания) */
  entity?: TEntity | null
  /** Функция получения ID из сущности */
  getId?: (entity: TEntity) => string
  /** Функция преобразования сущности в defaultValues */
  toFormValues: (entity: TEntity | null | undefined) => TFormInput
  /** Callback при отправке формы */
  onSubmit: (data: TFormInput) => Promise<FormActionResult>
  /** Сообщение об успехе (опционально) */
  successMessage?: string
}

/** Результат хука useAdminForm */
export interface UseAdminFormReturn<TFormInput> {
  /** Начальные значения формы */
  defaultValues: TFormInput
  /** Обработчик отправки формы */
  handleSubmit: (data: TFormInput) => Promise<void>
  /** Настройки persistence */
  persistence: ReturnType<typeof createFormPersistence>
  /** Режим редактирования */
  isEditing: boolean
}

/**
 * Хук для админ-форм с общей логикой:
 * - defaultValues через useMemo
 * - handleSubmit с toaster для ошибок
 * - persistence для сохранения черновиков
 *
 * @example
 * ```tsx
 * const { defaultValues, handleSubmit, persistence, isEditing } = useAdminForm({
 *   entityKey: 'mandala',
 *   entity: mandala,
 *   getId: (m) => m.id,
 *   toFormValues: (m) => m ? { name: m.name, ... } : { name: '', ... },
 *   onSubmit: createMandala,
 * })
 *
 * return (
 *   <Form
 *     initialValue={defaultValues}
 *     schema={schema}
 *     onSubmit={handleSubmit}
 *     persistence={persistence}
 *   >
 *     ...
 *   </Form>
 * )
 * ```
 */
export function useAdminForm<TEntity, TFormInput>({
  entityKey,
  entity,
  getId = (e) => (e as { id: string }).id,
  toFormValues,
  onSubmit,
  successMessage,
}: UseAdminFormOptions<TEntity, TFormInput>): UseAdminFormReturn<TFormInput> {
  const isEditing = !!entity

  const defaultValues = useMemo(() => toFormValues(entity), [entity, toFormValues])

  const persistence = useMemo(
    () => createFormPersistence(entityKey, entity ? getId(entity) : undefined),
    [entityKey, entity, getId]
  )

  const handleSubmit = useCallback(
    async (data: TFormInput): Promise<void> => {
      const result = await onSubmit(data)

      if (!result.success && result.error) {
        toaster.error({ title: result.error })
        return
      }

      if (result.success && successMessage) {
        toaster.success({ title: successMessage })
      }
    },
    [onSubmit, successMessage]
  )

  return {
    defaultValues,
    handleSubmit,
    persistence,
    isEditing,
  }
}
