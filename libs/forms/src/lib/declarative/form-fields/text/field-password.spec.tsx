import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

/** Весь CSS, который emotion вставил в документ (jsdom не считает media-query, но текст правил доступен) */
function injectedCss(): string {
  return Array.from(document.querySelectorAll('style'))
    .map((el) => el.textContent ?? '')
    .join('\n')
}

describe('FieldPassword', () => {
  describe('рендеринг', () => {
    it('рендерит поле пароля', () => {
      render(
        <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
          <Form.Field.Password name="password" label="Пароль" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Пароль')).toBeInTheDocument()
    })

    it('скрывает пароль по умолчанию', () => {
      const { container } = render(
        <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
          <Form.Field.Password name="password" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = container.querySelector('input[type="password"]')
      expect(input).toBeInTheDocument()
    })

    it('рендерит placeholder', () => {
      render(
        <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
          <Form.Field.Password name="password" placeholder="Введите пароль" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByPlaceholderText('Введите пароль')).toBeInTheDocument()
    })
  })

  describe('переключение видимости', () => {
    it('показывает кнопку переключения видимости', () => {
      render(
        <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
          <Form.Field.Password name="password" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const toggleBtn = screen.getByLabelText(/toggle password/i)
      expect(toggleBtn).toBeInTheDocument()
    })

    it('переключает тип input при клике на кнопку', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
          <Form.Field.Password name="password" />
        </Form>,
        { wrapper: TestWrapper },
      )

      // Изначально password
      expect(container.querySelector('input[type="password"]')).toBeInTheDocument()

      // Кликаем на toggle
      await user.click(screen.getByLabelText(/toggle password/i))

      // Теперь text
      expect(container.querySelector('input[type="text"]')).toBeInTheDocument()
    })
  })

  describe('цели касания (FM-020)', () => {
    it('кнопка показа пароля получает правило 44×44 под pointer: coarse', () => {
      render(
        <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
          <Form.Field.Password name="password" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const button = screen.getByRole('button', { name: 'Toggle password visibility' })
      const className = button.className.split(' ').find((c) => c.startsWith('css-'))
      expect(className).toBeTruthy()
      const css = injectedCss()
      const rule = css.slice(css.indexOf('pointer: coarse', css.indexOf(className!)))
      expect(css).toContain('pointer: coarse')
      expect(rule).toContain('44px')
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      const { container } = render(
        <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
          <Form.Field.Password name="password" disabled />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = container.querySelector('input')
      expect(input).toBeDisabled()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
          <Form.Field.Password name="password" helperText="Минимум 8 символов" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Минимум 8 символов')).toBeInTheDocument()
    })
  })
})
