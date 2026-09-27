import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldAddress } from './field-address'

/**
 * Placeholder `Form.Field.Address` (shadcn-скин) идёт через словарь `formFieldPlaceholder.*`
 * (`@letar/forms-react`): без провайдера — русский (прежнее поведение скина), `locale="en"` —
 * английский, как у Chakra-версии поля.
 */

function renderField(i18n?: { locale: string; t?: (key: string) => string }) {
  const form = (
    <TestForm defaultValues={{ address: '' }}>
      <FieldAddress name="address" label="Адрес" />
    </TestForm>
  )
  render(i18n ? <FormI18nProvider locale={i18n.locale} t={i18n.t}>{form}</FormI18nProvider> : form)
}

describe('FieldAddress (shadcn) — placeholder через i18n', () => {
  it('без провайдера: русский', () => {
    renderField()
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Начните вводить адрес...')
  })

  it('locale="en": английский, как у Chakra', () => {
    renderField({ locale: 'en' })
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Start typing address...')
  })

  it('t приложения переопределяет словарь по ключу', () => {
    const t = (key: string) => key === 'formFieldPlaceholder.address' ? 'Ваш адрес' : key
    renderField({ locale: 'en', t })
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Ваш адрес')
  })

  it('явный проп placeholder сильнее встроенного словаря', () => {
    render(
      <TestForm defaultValues={{ address: '' }}>
        <FieldAddress name="address" label="Адрес" placeholder="Кастомный placeholder" />
      </TestForm>,
    )
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Кастомный placeholder')
  })
})
