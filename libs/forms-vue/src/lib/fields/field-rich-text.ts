import { createLazyField } from '../core/create-lazy-field'

export type { RichTextButton, RichTextFieldProps } from './field-rich-text-impl'

/**
 * FieldRichText (headless) — WYSIWYG-редактор на Tiptap.
 *
 * `@tiptap/*` — тяжёлый peer-dep, нужный только этому полю. Реализация вынесена в
 * `field-rich-text-impl.ts` и подгружается через `createLazyField` (Vue-аналог `React.lazy` +
 * `Form.Captcha`) — потребители остальных text-полей (String, Password, Textarea...) не обязаны
 * резолвить tiptap вовсе.
 *
 * @example
 * ```ts
 * h(FieldRichText, { name: 'content', label: 'Содержимое' })
 * ```
 */
export const FieldRichText = createLazyField(
  () => import('./field-rich-text-impl').then((m) => m.FieldRichText),
)
