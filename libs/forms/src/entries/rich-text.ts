/**
 * `@letar/forms/rich-text` — WYSIWYG-поле на TipTap. Нужны `@tiptap/react`, `@tiptap/starter-kit` и расширения
 * `image`, `link`, `placeholder`, `underline`; остальным приложениям они не нужны.
 *
 * Подключается в `createForm`. ⚠️ Ключ обязан совпадать с именем поля: `RichText`. По этому же ключу автоформа
 * (`fieldType: 'richText'`) находит компонент.
 *
 * @example
 * ```tsx
 * import { createForm } from '@letar/forms'
 * import { FieldRichText } from '@letar/forms/rich-text'
 *
 * export const AppForm = createForm({ extraFields: { RichText: FieldRichText } })
 *
 * <AppForm.Field.RichText name="content" label="Текст" />
 * ```
 */
export { FieldRichText, type RichTextFieldProps } from '../lib/declarative/form-fields/text/field-rich-text'
