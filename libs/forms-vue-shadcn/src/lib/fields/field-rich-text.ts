import { createLazyField } from '@letar/forms-vue/core'

export type { RichTextButton } from '@letar/forms-vue/core'
export type { RichTextFieldProps } from './field-rich-text-impl'

/**
 * FieldRichText (Reka-скин) — WYSIWYG-редактор на Tiptap.
 *
 * `@tiptap/*` — тяжёлый peer-dep, нужный только этому полю. Реализация вынесена в
 * `field-rich-text-impl.ts` и подгружается через `createLazyField` (тот же паттерн, что у
 * headless-версии и React `Form.Captcha`).
 *
 * @example
 * ```ts
 * h(FieldRichText, { name: 'content', label: 'Содержимое' })
 * ```
 */
export const FieldRichText = createLazyField(
  () => import('./field-rich-text-impl').then((m) => m.FieldRichText),
)
