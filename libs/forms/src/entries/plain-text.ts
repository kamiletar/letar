'use client'

/** Optional редактор обычного текста: ядро форм не импортирует TipTap. */
export {
  FieldPlainText,
  PlainTextEditor,
  type PlainTextEditorProps,
  type PlainTextFieldProps,
} from '../lib/declarative/form-fields/text/field-plain-text'
export type {
  PlainTextEditorHandle,
  PlainTextHistoryState,
  PlainTextSelection,
  PlainTextTransaction,
} from '../lib/declarative/form-fields/text/plain-text-controller'
