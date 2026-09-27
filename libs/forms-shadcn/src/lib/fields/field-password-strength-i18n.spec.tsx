import { FormI18nProvider } from '@letar/forms-react'
import { TestForm } from '@letar/forms-react/testing'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FieldPasswordStrength } from './field-password-strength'

/**
 * Placeholder `Form.Field.PasswordStrength` (shadcn-скин) идёт через словарь
 * `formFieldPlaceholder.*` (`@letar/forms-react`): без провайдера — русский (прежнее поведение
 * скина), `locale="en"` — английский, как у Chakra-версии поля.
 *
 * Требования, подписи силы и `aria-label` кнопки-глаза идут через отдельный общий словарь
 * `formPasswordStrength.*` (`field-password-strength-strings.ts`) — набор строк идентичен
 * Chakra-версии, без провайдера shadcn остаётся русским (тот же контракт, что у placeholder).
 */

function renderField(i18n?: { locale: string; t?: (key: string) => string }) {
  const form = (
    <TestForm defaultValues={{ password: '' }}>
      <FieldPasswordStrength name="password" label="Пароль" />
    </TestForm>
  )
  const { container } = render(
    i18n ? <FormI18nProvider locale={i18n.locale} t={i18n.t}>{form}</FormI18nProvider> : form,
  )
  return container
}

async function typePassword(container: HTMLElement, password: string) {
  const input = container.querySelector('input') as HTMLInputElement
  await userEvent.type(input, password)
  return input
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

describe('FieldPasswordStrength (shadcn) — требования и подписи силы через i18n', () => {
  it('без провайдера: русский (прежний хардкод скина)', async () => {
    const container = renderField()
    await typePassword(container, 'a')

    expect(screen.getByText('Минимум 8 символов')).toBeInTheDocument()
    expect(screen.getByText('Хотя бы одна заглавная буква')).toBeInTheDocument()
    expect(screen.getByText('Хотя бы одна строчная буква')).toBeInTheDocument()
    expect(screen.getByText('Хотя бы одна цифра')).toBeInTheDocument()
    expect(screen.getByText('Хотя бы один спецсимвол (!@#$%^&*)')).toBeInTheDocument()
    expect(screen.getByText('Надёжность')).toBeInTheDocument()
    expect(screen.getByText('Слабый')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Показать/скрыть пароль' })).toBeInTheDocument()
  })

  it('locale="en": английский, как у Chakra', async () => {
    const container = renderField({ locale: 'en' })
    await typePassword(container, 'a')

    expect(screen.getByText('Minimum 8 characters')).toBeInTheDocument()
    expect(screen.getByText('At least one uppercase letter')).toBeInTheDocument()
    expect(screen.getByText('Strength')).toBeInTheDocument()
    expect(screen.getByText('Weak')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show/hide password' })).toBeInTheDocument()
  })

  it('t приложения переопределяет словарь по ключу', async () => {
    const t = (key: string) => (key === 'formPasswordStrength.strengthLabel' ? 'Надёжность пароля' : key)
    const container = renderField({ locale: 'en', t })
    await typePassword(container, 'a')

    expect(screen.getByText('Надёжность пароля')).toBeInTheDocument()
  })
})
