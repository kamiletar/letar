'use client'

import { FieldRichText } from '@letar/forms-shadcn'

import { DemoForm, DemoPageLayout } from '../_components'

export default function RichTextDemoPage() {
  return (
    <DemoPageLayout
      title="FieldRichText (beta)"
      description={'Tiptap WYSIWYG-редактор — изолированная песочница, без интеграции с полями других демо. Без вставки '
        + 'изображений (нужен upload endpoint) — кнопка «Ссылка» использует window.prompt.'}
    >
      <DemoForm<{ content: string }>
        defaultValues={{ content: '<p>Начальный <strong>текст</strong> с <em>форматированием</em>.</p>' }}
        onSubmit={(value) => {
          // eslint-disable-next-line no-console
          console.log('richtext submit', value)
        }}
      >
        <FieldRichText name="content" label="Содержимое" minHeight="180px" />

        <button
          type="submit"
          className="bg-primary text-primary-foreground mt-4 rounded-md px-4 py-2 text-sm font-medium"
        >
          Отправить
        </button>
      </DemoForm>
    </DemoPageLayout>
  )
}
