import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldDateTimePicker', () => {
  describe('рендеринг', () => {
    it('рендерит поле даты и времени', () => {
      render(
        <Form initialValue={{ event: '' }} onSubmit={vi.fn()}>
          <Form.Field.DateTimePicker name="event" label="Дата события" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Дата события')).toBeInTheDocument()
    })

    it('рендерит два input (дата и время)', () => {
      const { container } = render(
        <Form initialValue={{ event: '' }} onSubmit={vi.fn()}>
          <Form.Field.DateTimePicker name="event" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const inputs = container.querySelectorAll('input')
      expect(inputs.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      const { container } = render(
        <Form initialValue={{ event: '' }} onSubmit={vi.fn()}>
          <Form.Field.DateTimePicker name="event" disabled />
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
        <Form initialValue={{ event: '' }} onSubmit={vi.fn()}>
          <Form.Field.DateTimePicker name="event" helperText="Выберите дату и время" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Выберите дату и время')).toBeInTheDocument()
    })
  })
})
