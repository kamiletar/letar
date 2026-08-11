'use client'

import { createLazyComponent } from '../../lazy-component'

// Тип не тянет рантайм-импорт @tiptap/* — интерфейс, стирается при компиляции
export type { ImageUploadConfig, RichTextFieldProps } from './field-rich-text-impl'

/**
 * Form.Field.RichText - WYSIWYG rich text editor
 *
 * `@tiptap/*` — тяжёлый peer-dep, нужный только этому полю. Реализация вынесена
 * в field-rich-text-impl.tsx и подгружается через `lazy()` + dynamic `import()`
 * (тот же паттерн, что у Form.Captcha) — потребители остальных text-полей
 * (String, Password, Textarea...) не обязаны резолвить tiptap вовсе.
 *
 * @example Basic usage
 * ```tsx
 * <Form.Field.RichText name="content" label="Content" />
 * ```
 *
 * @example With custom height
 * ```tsx
 * <Form.Field.RichText
 *   name="description"
 *   label="Description"
 *   minHeight="200px"
 *   maxHeight="400px"
 * />
 * ```
 *
 * @example With limited toolbar
 * ```tsx
 * <Form.Field.RichText
 *   name="comment"
 *   label="Comment"
 *   toolbarButtons={['bold', 'italic', 'link']}
 * />
 * ```
 *
 * @example JSON output (for database storage)
 * ```tsx
 * <Form.Field.RichText
 *   name="article"
 *   label="Article"
 *   outputFormat="json"
 * />
 * ```
 */
export const FieldRichText = createLazyComponent(
  () => import('./field-rich-text-impl').then((m) => ({ default: m.FieldRichText })),
  '150px',
)
