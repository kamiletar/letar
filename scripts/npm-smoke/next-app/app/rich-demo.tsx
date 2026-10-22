'use client'

import { createForm } from '@letar/forms'
import { FieldRichText } from '@letar/forms/rich-text'

// Подключаемое поле: редактор приходит подпутём `@letar/forms/rich-text` (ему нужны @tiptap/*, они есть в package.json
// фикстуры). Ключ в extraFields совпадает с именем поля — по нему же `fieldType: 'richText'` находит компонент.
const RichForm = createForm({ extraFields: { RichText: FieldRichText } })

export function RichDemo() {
  return (
    <RichForm initialValue={{ body: '' }} onSubmit={async () => {}}>
      <RichForm.Field.RichText name="body" label="Текст" />
      <RichForm.Button.Submit>Сохранить</RichForm.Button.Submit>
    </RichForm>
  )
}
