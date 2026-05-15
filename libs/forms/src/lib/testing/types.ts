import type { RenderResult } from '@testing-library/react'
import type { ComponentType } from 'react'

/**
 * Опции для renderForm при передаче компонента
 */
export interface RenderFormOptions<TData extends Record<string, unknown> = Record<string, unknown>> {
  /** Начальные значения формы */
  defaults?: Partial<TData>
  /** Обработчик сабмита (по умолчанию — vi.fn()) */
  onSubmit?: (...args: unknown[]) => void
  /** Дополнительные пропсы для компонента */
  props?: Record<string, unknown>
}

/**
 * Результат renderForm — стандартный RenderResult + хелперы
 */
export interface RenderFormResult<TData extends Record<string, unknown> = Record<string, unknown>>
  extends RenderResult
{
  /** Мок-функция onSubmit */
  onSubmit: (...args: unknown[]) => void
  /** Заполнить поле по имени */
  fillField: (name: string & keyof TData, value: unknown) => Promise<void>
  /** Кликнуть кнопку сабмита */
  submitForm: (buttonText?: string) => Promise<void>
  /** Проверить ошибку на поле */
  expectFieldError: (name: string & keyof TData, message: string) => void
  /** Проверить отсутствие ошибки */
  expectNoFieldError: (name: string & keyof TData) => void
}

/**
 * Тип компонента формы для renderForm
 */
export type FormComponent<TData extends Record<string, unknown> = Record<string, unknown>> = ComponentType<{
  onSubmit?: (...args: unknown[]) => void
  initialValue?: TData
  defaults?: TData
}>
