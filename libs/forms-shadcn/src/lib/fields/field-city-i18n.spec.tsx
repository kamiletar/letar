import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldCity } from './field-city'

/**
 * Placeholder `Form.Field.City` (shadcn-скин) идёт через словарь `formFieldPlaceholder.*`
 * (`@letar/forms-react`): без провайдера — русский (прежнее поведение скина), `locale="en"` —
 * английский, как у Chakra-версии поля.
 */

function renderField(i18n?: { locale: string; t?: (key: string) => string }) {
  const form = (
    <TestForm defaultValues={{ city: '' }}>
      <FieldCity name="city" label="Город" />
    </TestForm>
  )
  render(i18n ? <FormI18nProvider locale={i18n.locale} t={i18n.t}>{form}</FormI18nProvider> : form)
}

describe('FieldCity (shadcn) — placeholder через i18n', () => {
  it('без провайдера: русский', () => {
    renderField()
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Введите город...')
  })

  it('locale="en": английский, как у Chakra', () => {
    renderField({ locale: 'en' })
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Enter city')
  })

  it('t приложения переопределяет словарь по ключу', () => {
    const t = (key: string) => key === 'formFieldPlaceholder.city' ? 'Ваш город' : key
    renderField({ locale: 'en', t })
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Ваш город')
  })

  it('явный проп placeholder сильнее встроенного словаря', () => {
    render(
      <TestForm defaultValues={{ city: '' }}>
        <FieldCity name="city" label="Город" placeholder="Кастомный placeholder" />
      </TestForm>,
    )
    expect(screen.getByRole('combobox')).toHaveAttribute('placeholder', 'Кастомный placeholder')
  })
})
