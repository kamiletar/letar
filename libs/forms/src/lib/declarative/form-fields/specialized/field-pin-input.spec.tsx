import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldPinInput', () => {
  describe('rendering', () => {
    it('рендерит pin input с 4 полями по умолчанию', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ pin: '' }} onSubmit={vi.fn()}>
            <Form.Field.PinInput name="pin" />
          </Form>
        </TestWrapper>,
      )

      const inputs = screen.getAllByRole('textbox')
      // PinInput рендерит отдельные textbox + hidden input
      expect(inputs.length).toBeGreaterThanOrEqual(4)
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ pin: '' }} onSubmit={vi.fn()}>
            <Form.Field.PinInput name="pin" label="Введите PIN" />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('Введите PIN')).toBeInTheDocument()
    })

    it('рендерит кастомное количество полей', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ pin: '' }} onSubmit={vi.fn()}>
            <Form.Field.PinInput name="pin" count={6} />
          </Form>
        </TestWrapper>,
      )

      const inputs = screen.getAllByRole('textbox')
      expect(inputs.length).toBeGreaterThanOrEqual(6)
    })
  })

  describe('states', () => {
    it('disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ pin: '' }} onSubmit={vi.fn()}>
            <Form.Field.PinInput name="pin" disabled />
          </Form>
        </TestWrapper>,
      )

      const inputs = screen.getAllByRole('textbox')
      for (const input of inputs) {
        expect(input).toBeDisabled()
      }
    })
  })

  describe('initial value', () => {
    it('отображает начальное значение', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ pin: '1234' }} onSubmit={vi.fn()}>
            <Form.Field.PinInput name="pin" count={4} />
          </Form>
        </TestWrapper>,
      )

      const inputs = screen.getAllByRole('textbox')
      // Каждый input должен содержать одну цифру
      expect(inputs[0]).toHaveValue('1')
      expect(inputs[1]).toHaveValue('2')
      expect(inputs[2]).toHaveValue('3')
      expect(inputs[3]).toHaveValue('4')
    })
  })
})
