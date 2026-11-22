'use client'

import { createForm } from '@letar/forms'
import { FieldPlainText } from '@letar/forms/plain-text'
import { FieldRichText } from '@letar/forms/rich-text'

// Подключаемое поле: редактор приходит подпутём `@letar/forms/rich-text` (ему нужны @tiptap/*, они есть в package.json
// фикстуры). Ключ в extraFields совпадает с именем поля — по нему же `fieldType: 'richText'` находит компонент.
const RichForm = createForm({ extraFields: { RichText: FieldRichText, PlainText: FieldPlainText } })

export function RichDemo() {
  return (
    <RichForm initialValue={{ body: '', plain: '' }} onSubmit={async () => {}}>
      <RichForm.Field.RichText name="body" label="Текст" />
      <RichForm.Field.PlainText name="plain" label="Обычный текст" />
      <RichForm.Button.Submit>Сохранить</RichForm.Button.Submit>
    </RichForm>
  )
}
