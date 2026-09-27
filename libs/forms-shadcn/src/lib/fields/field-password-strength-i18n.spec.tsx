import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { FieldPasswordStrength } from './field-password-strength'

/**
 * Placeholder `Form.Field.PasswordStrength` (shadcn-скин) идёт через словарь
 * `formFieldPlaceholder.*` (`@letar/forms-react`): без провайдера — русский (прежнее поведение
 * скина), `locale="en"` — английский, как у Chakra-версии поля.
 */

function renderField(i18n?: { locale: string; t?: (key: string) => string }) {
  const form = (
    <TestForm defaultValues={{ password: '' }}>
      <FieldPasswordStrength name="password" label="Пароль" />
    </TestForm>
  )
  render(i18n ? <FormI18nProvider locale={i18n.locale} t={i18n.t}>{form}</FormI18nProvider> : form)
}

describe('FieldPasswordStrength (shadcn) — placeholder через i18n', () => {
  it('без провайдера: русский', () => {
    renderField()
    expect(screen.getByPlaceholderText('Введите пароль')).toBeInTheDocument()
  })

  it('locale="en": английский, как у Chakra', () => {
    renderField({ locale: 'en' })
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument()
  })

  it('t приложения переопределяет словарь по ключу', () => {
    const t = (key: string) => key === 'formFieldPlaceholder.passwordStrength' ? 'Ваш пароль' : key
    renderField({ locale: 'en', t })
    expect(screen.getByPlaceholderText('Ваш пароль')).toBeInTheDocument()
  })

  it('явный проп placeholder сильнее встроенного словаря', () => {
    render(
      <TestForm defaultValues={{ password: '' }}>
        <FieldPasswordStrength name="password" label="Пароль" placeholder="Кастомный placeholder" />
      </TestForm>,
    )
    expect(screen.getByPlaceholderText('Кастомный placeholder')).toBeInTheDocument()
  })
})
