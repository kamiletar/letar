'use client'

import type { ReactNode } from 'react'
import type { z } from 'zod/v4'

/**
 * Шаблон формы — Zod schema + defaultValues + рендер.
 *
 * @template T - тип данных формы
 */
export interface FormTemplate<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Уникальное имя шаблона */
  name: string
  /** Человекочитаемое название */
  title: string
  /** Описание */
  description: string
  /** Категория шаблона */
  category: 'auth' | 'feedback' | 'survey' | 'business' | 'ecommerce' | 'profile' | 'address'
  /** Zod schema */
  schema: z.ZodType<T>
  /** Значения по умолчанию */
  defaultValues: T
  /** JSX рендер полей (без Form обёртки) */
  renderFields: () => ReactNode
}

/**
 * Props для Form.FromTemplate
 */
export interface FormFromTemplateProps<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Шаблон */
  template: FormTemplate<T>
  /** Callback при отправке */
  onSubmit: (data: T) => void | Promise<void>
  /** Override начальных значений */
  initialValue?: Partial<T>
  /** Override полей (исключить, переименовать label) */
  override?: {
    /** Поля для исключения */
    exclude?: string[]
    /** Override props полей */
    fields?: Record<string, { label?: string; placeholder?: string }>
  }
  /** Текст кнопки отправки */
  submitLabel?: string
  /** Показать debug */
  debug?: boolean
}
