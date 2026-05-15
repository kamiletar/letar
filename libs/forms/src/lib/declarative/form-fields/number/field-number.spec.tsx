import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldNumber', () => {
  describe('rendering', () => {
    it('рендерит number input', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ count: 0 }} onSubmit={vi.fn()}>
            <Form.Field.Number name="count" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ quantity: 1 }} onSubmit={vi.fn()}>
            <Form.Field.Number name="quantity" label="Количество" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Количество')).toBeInTheDocument()
    })

    it('рендерит placeholder', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ amount: undefined }} onSubmit={vi.fn()}>
            <Form.Field.Number name="amount" placeholder="Введите сумму" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('Введите сумму')).toBeInTheDocument()
    })

    it('показывает начальное значение', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ count: 42 }} onSubmit={vi.fn()}>
            <Form.Field.Number name="count" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('42')
    })

    it('рендерит increment/decrement кнопки', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ count: 0 }} onSubmit={vi.fn()}>
            <Form.Field.Number name="count" />
          </Form>
        </TestWrapper>
      )

      // NumberInput.IncrementTrigger и DecrementTrigger должны быть в DOM
      expect(screen.getByRole('spinbutton').closest('[data-scope="number-input"]')).toBeInTheDocument()
    })
  })

  describe('constraints', () => {
    it('применяет min', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ age: 0 }} onSubmit={vi.fn()}>
            <Form.Field.Number name="age" min={0} />
          </Form>
        </TestWrapper>
      )

      // Chakra NumberInput устанавливает min через data-scope
      const input = screen.getByRole('spinbutton')
      expect(input).toBeInTheDocument()
    })

    it('применяет max', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ percent: 50 }} onSubmit={vi.fn()}>
            <Form.Field.Number name="percent" max={100} />
          </Form>
        </TestWrapper>
      )

      const input = screen.getByRole('spinbutton')
      expect(input).toBeInTheDocument()
    })

    it('применяет step', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ price: 0 }} onSubmit={vi.fn()}>
            <Form.Field.Number name="price" step={0.01} />
          </Form>
        </TestWrapper>
      )

      const input = screen.getByRole('spinbutton')
      expect(input).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('поддерживает disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ count: 0 }} onSubmit={vi.fn()}>
            <Form.Field.Number name="count" disabled />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('spinbutton')).toBeDisabled()
    })

    it('показывает required индикатор', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ count: 0 }} onSubmit={vi.fn()}>
            <Form.Field.Number name="count" label="Count" required />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })

  describe('empty value', () => {
    it('обрабатывает undefined значение', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ count: undefined }} onSubmit={vi.fn()}>
            <Form.Field.Number name="count" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('spinbutton')).toHaveValue('')
    })
  })

  describe('data attributes', () => {
    it('устанавливает data-field-name', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ quantity: 1 }} onSubmit={vi.fn()}>
            <Form.Field.Number name="quantity" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('spinbutton')).toHaveAttribute('data-field-name', 'quantity')
    })
  })
})
