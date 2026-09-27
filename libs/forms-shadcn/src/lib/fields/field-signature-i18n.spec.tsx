import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FieldSignature } from './field-signature'

/**
 * Встроенные строки `Form.Field.Signature` shadcn-скина идут через словарь `formSignature.*`
 * (`@letar/forms-react`): без провайдера — русский (прежнее поведение скина), `locale="en"` —
 * английский, как у Chakra-версии поля. Кнопка очистки — общий `formSelection.clear`.
 */

function renderField(i18n?: { locale: string; t?: (key: string) => string }) {
  const form = (
    <TestForm defaultValues={{ signature: '' }}>
      <FieldSignature name="signature" label="Подпись" />
    </TestForm>
  )
  render(i18n ? <FormI18nProvider locale={i18n.locale} t={i18n.t}>{form}</FormI18nProvider> : form)
}

const renderTypedAndGetInput = async () => {
  await userEvent.click(screen.getByRole('button', { name: /(ввести текст|type)/i }))
  return screen.getByRole('textbox')
}

describe('FieldSignature (shadcn) — строки через i18n', () => {
  it('без провайдера: русские подписи вкладок, placeholder, aria-label', () => {
    renderField()
    expect(screen.getByRole('button', { name: 'Рисовать' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ввести текст' })).toBeInTheDocument()
    expect(screen.getByText('Подпишите здесь')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Область подписи' })).toBeInTheDocument()
  })

  it('locale="en": английские строки, как у Chakra', async () => {
    renderField({ locale: 'en' })
    expect(screen.getByRole('button', { name: 'Draw' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Type' })).toBeInTheDocument()
    expect(screen.getByText('Sign here')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Signature pad' })).toBeInTheDocument()

    const input = await renderTypedAndGetInput()
    expect(input).toHaveAttribute('placeholder', 'Type your name...')
  })

  it('locale="ru" с провайдером: словарь по-русски', () => {
    renderField({ locale: 'ru' })
    expect(screen.getByText('Подпишите здесь')).toBeInTheDocument()
  })

  it('t приложения переопределяет словарь по ключу', () => {
    const t = (key: string) => key === 'formSignature.placeholder' ? 'Ваша подпись' : key
    renderField({ locale: 'en', t })
    expect(screen.getByText('Ваша подпись')).toBeInTheDocument()
  })

  it('очистка использует общий ключ formSelection.clear', async () => {
    renderField({ locale: 'en' })
    const input = await renderTypedAndGetInput()
    await userEvent.type(input, 'Ivan')
    expect(screen.getByRole('button', { name: 'Clear' })).toBeInTheDocument()
  })
})
