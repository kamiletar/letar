import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldOTPInput', () => {
  describe('rendering', () => {
    it('рендерит OTP input с 6 полями по умолчанию', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
            <Form.Field.OTPInput name="code" />
          </Form>
        </TestWrapper>
      )

      const inputs = screen.getAllByRole('textbox')
      expect(inputs.length).toBeGreaterThanOrEqual(6)
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
            <Form.Field.OTPInput name="code" label="Код подтверждения" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Код подтверждения')).toBeInTheDocument()
    })
  })

  describe('resend', () => {
    it('рендерит кнопку повторной отправки', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
            <Form.Field.OTPInput name="code" onResend={vi.fn()} />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('button', { name: /submit again/i })).toBeInTheDocument()
    })

    it('не рендерит кнопку без onResend', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
            <Form.Field.OTPInput name="code" />
          </Form>
        </TestWrapper>
      )

      expect(screen.queryByRole('button', { name: /submit again/i })).not.toBeInTheDocument()
    })
  })

  describe('custom length', () => {
    it('рендерит кастомное количество полей', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
            <Form.Field.OTPInput name="code" length={4} />
          </Form>
        </TestWrapper>
      )

      const inputs = screen.getAllByRole('textbox')
      expect(inputs.length).toBeGreaterThanOrEqual(4)
    })
  })
})
