import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { FormI18nProvider } from '@letar/forms-react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from '../../'

/**
 * Требования к паролю, подписи силы («Слабый/Средний/Хороший/Сильный» + подпись «Strength») и
 * `aria-label` кнопки-глаза `Form.Field.PasswordStrength` (Chakra-скин) идут через общий словарь
 * `formPasswordStrength.*` (`@letar/forms-react`, `field-password-strength-strings.ts`) — без
 * провайдера английский (контракт Chakra-скина), `locale="ru"` — русский, как у shadcn-версии
 * поля. Placeholder сюда не входит — у него свой ключ `formField.passwordStrength.placeholder`.
 */

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

function renderField(i18n?: { locale: string; t?: (key: string) => string }) {
  const form = (
    <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
      <Form.Field.PasswordStrength name="password" label="Пароль" />
    </Form>
  )
  const { container } = render(
    <TestWrapper>
      {i18n ? <FormI18nProvider locale={i18n.locale} t={i18n.t}>{form}</FormI18nProvider> : form}
    </TestWrapper>,
  )
  return container
}

async function typePassword(container: HTMLElement, password: string) {
  const input = container.querySelector('input') as HTMLInputElement
  await userEvent.type(input, password)
  return input
}

describe('FieldPasswordStrength (Chakra) — требования и подписи силы через i18n', () => {
  it('без провайдера: английский', async () => {
    const container = renderField()
    await typePassword(container, 'a')

    expect(screen.getByText('Minimum 8 characters')).toBeInTheDocument()
    expect(screen.getByText('At least one uppercase letter')).toBeInTheDocument()
    expect(screen.getByText('At least one lowercase letter')).toBeInTheDocument()
    expect(screen.getByText('At least one digit')).toBeInTheDocument()
    expect(screen.getByText('At least one special character (!@#$%^&*)')).toBeInTheDocument()
    expect(screen.getByText('Strength')).toBeInTheDocument()
    expect(screen.getByText('Weak')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument()
  })

  it('locale="ru": русский, как у shadcn', async () => {
    const container = renderField({ locale: 'ru' })
    await typePassword(container, 'a')

    expect(screen.getByText('Минимум 8 символов')).toBeInTheDocument()
    expect(screen.getByText('Хотя бы одна заглавная буква')).toBeInTheDocument()
    expect(screen.getByText('Надёжность')).toBeInTheDocument()
    expect(screen.getByText('Слабый')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Показать пароль' })).toBeInTheDocument()
  })

  it('aria-label кнопки-глаза переключается вместе с видимостью пароля', async () => {
    renderField({ locale: 'en' })
    const toggle = screen.getByRole('button', { name: 'Show password' })
    await userEvent.click(toggle)
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument()
  })

  it('t приложения переопределяет словарь по ключу', async () => {
    const t = (key: string) => (key === 'formPasswordStrength.strengthLabel' ? 'Надёжность пароля' : key)
    const container = renderField({ locale: 'ru', t })
    await typePassword(container, 'a')

    expect(screen.getByText('Надёжность пароля')).toBeInTheDocument()
  })
})
