import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldNumberInput', () => {
  describe('rendering', () => {
    it('рендерит number input со стрелками', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ qty: 1 }} onSubmit={vi.fn()}>
            <Form.Field.NumberInput name="qty" />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ qty: 1 }} onSubmit={vi.fn()}>
            <Form.Field.NumberInput name="qty" label="Количество" />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('Количество')).toBeInTheDocument()
    })

    it('показывает начальное значение', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ qty: 42 }} onSubmit={vi.fn()}>
            <Form.Field.NumberInput name="qty" />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('42')
    })

    it('рендерит кнопки increment/decrement', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ qty: 0 }} onSubmit={vi.fn()}>
            <Form.Field.NumberInput name="qty" />
          </Form>
        </TestWrapper>,
      )

      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('focus behavior', () => {
    it('выделяет содержимое поля при фокусе (select-on-focus)', async () => {
      const user = userEvent.setup()
      render(
        <TestWrapper>
          <Form initialValue={{ qty: 0 }} onSubmit={vi.fn()}>
            <Form.Field.NumberInput name="qty" />
          </Form>
        </TestWrapper>,
      )

      const input = screen.getByRole('spinbutton') as HTMLInputElement
      await user.click(input)

      expect(input.selectionStart).toBe(0)
      expect(input.selectionEnd).toBe(input.value.length)
    })
  })

  describe('states', () => {
    it('disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ qty: 5 }} onSubmit={vi.fn()}>
            <Form.Field.NumberInput name="qty" disabled />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByRole('spinbutton')).toBeDisabled()
    })
  })
})
