import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldPasswordStrength', () => {
  describe('рендеринг', () => {
    it('рендерит поле пароля с индикатором силы', () => {
      render(
        <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
          <Form.Field.PasswordStrength name="password" label="Пароль" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Пароль')).toBeInTheDocument()
    })

    it('рендерит input поле', () => {
      const { container } = render(
        <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
          <Form.Field.PasswordStrength name="password" />
        </Form>,
        { wrapper: TestWrapper }
      )

      const input = container.querySelector('input')
      expect(input).toBeInTheDocument()
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      const { container } = render(
        <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
          <Form.Field.PasswordStrength name="password" disabled />
        </Form>,
        { wrapper: TestWrapper }
      )

      const input = container.querySelector('input')
      expect(input).toBeDisabled()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
          <Form.Field.PasswordStrength name="password" helperText="Придумайте надёжный пароль" />
        </Form>,
        { wrapper: TestWrapper }
      )

      expect(screen.getByText('Придумайте надёжный пароль')).toBeInTheDocument()
    })
  })
})
