'use client'

import { createContext, useContext } from 'react'
import type { TableEditorContextValue } from './table-types'

/**
 * Контекст TableEditor — передаёт состояние таблицы потомкам.
 */
export const TableEditorContext = createContext<TableEditorContextValue | null>(null)

/**
 * Хук доступа к контексту TableEditor.
 * Бросает ошибку если используется вне TableEditor.
 */
export function useTableEditorContext(): TableEditorContextValue {
  const ctx = useContext(TableEditorContext)
  if (!ctx) {
    throw new Error('useTableEditorContext must be used inside <Form.Field.TableEditor>')
  }
  return ctx
}
