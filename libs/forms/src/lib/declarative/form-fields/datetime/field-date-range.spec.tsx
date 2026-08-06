import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldDateRange', () => {
  describe('рендеринг', () => {
    it('рендерит поле диапазона дат', () => {
      render(
        <Form initialValue={{ period: { start: '', end: '' } }} onSubmit={vi.fn()}>
          <Form.Field.DateRange name="period" label="Период" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Период')).toBeInTheDocument()
    })

    it('рендерит два поля ввода (начало и конец)', () => {
      const { container } = render(
        <Form initialValue={{ period: { start: '', end: '' } }} onSubmit={vi.fn()}>
          <Form.Field.DateRange name="period" />
        </Form>,
        { wrapper: TestWrapper },
      )

      // DateRange рендерит два input'а
      const inputs = container.querySelectorAll('input')
      expect(inputs.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      const { container } = render(
        <Form initialValue={{ period: { start: '', end: '' } }} onSubmit={vi.fn()}>
          <Form.Field.DateRange name="period" disabled />
        </Form>,
        { wrapper: TestWrapper },
      )

      const inputs = container.querySelectorAll('input')
      for (const input of inputs) {
        expect(input).toBeDisabled()
      }
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ period: { start: '', end: '' } }} onSubmit={vi.fn()}>
          <Form.Field.DateRange name="period" helperText="Выберите диапазон дат" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Выберите диапазон дат')).toBeInTheDocument()
    })
  })
})
