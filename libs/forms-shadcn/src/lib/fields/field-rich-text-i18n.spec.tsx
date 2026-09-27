import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { render, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { FieldRichText } from './field-rich-text'

/**
 * Placeholder `Form.Field.RichText` (shadcn-скин, атрибут `data-placeholder` пустого параграфа
 * Tiptap) идёт через словарь `formFieldPlaceholder.*` (`@letar/forms-react`): без провайдера —
 * русский (прежний хардкод скина), `locale="en"` — английский, как у Chakra-версии поля.
 */

// Поле грузится лениво (`import()`) — прогреваем модуль своим таймаутом, см. field-rich-text.spec.tsx
beforeAll(async () => {
  await import('./field-rich-text-impl')
}, 60_000)

function renderField(i18n?: { locale: string; t?: (key: string) => string }) {
  const form = (
    <TestForm defaultValues={{ content: '' }}>
      <FieldRichText name="content" label="Содержимое" />
    </TestForm>
  )
  render(i18n ? <FormI18nProvider locale={i18n.locale} t={i18n.t}>{form}</FormI18nProvider> : form)
}

describe('FieldRichText (shadcn) — placeholder через i18n', () => {
  it('без провайдера: русский (прежний хардкод)', async () => {
    renderField()
    await waitFor(() => {
      expect(document.querySelector('[data-placeholder]')).toHaveAttribute('data-placeholder', 'Начните вводить...')
    })
  })

  it('locale="en": английский, как у Chakra', async () => {
    renderField({ locale: 'en' })
    await waitFor(() => {
      expect(document.querySelector('[data-placeholder]')).toHaveAttribute('data-placeholder', 'Start typing...')
    })
  })

  it('t приложения переопределяет словарь по ключу', async () => {
    const t = (key: string) => key === 'formFieldPlaceholder.richText' ? 'Пишите здесь' : key
    renderField({ locale: 'en', t })
    await waitFor(() => {
      expect(document.querySelector('[data-placeholder]')).toHaveAttribute('data-placeholder', 'Пишите здесь')
    })
  })
})
