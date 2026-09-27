import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { render, screen, waitFor } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vitest'
import { FieldRichText } from './field-rich-text'

/**
 * Подписи кнопок тулбара `Form.Field.RichText` (shadcn-скин) идут через общий словарь
 * `formToolbar.*` (`@letar/forms-react`): без провайдера — русский (прежний хардкод скина),
 * `locale="en"` — английский, как у Chakra-версии поля.
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

describe('FieldRichText (shadcn) — подписи тулбара через i18n', () => {
  it('без провайдера: русский (прежний хардкод)', async () => {
    renderField()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Полужирный' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Отменить' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Повторить' })).toBeInTheDocument()
  })

  it('locale="en": английский, как у Chakra', async () => {
    renderField({ locale: 'en' })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Redo' })).toBeInTheDocument()
  })

  it('t приложения переопределяет словарь по ключу', async () => {
    const t = (key: string) => (key === 'formToolbar.bold' ? 'Жирный текст' : key)
    renderField({ locale: 'en', t })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Жирный текст' })).toBeInTheDocument()
    })
  })
})
