import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldPercentage', () => {
  describe('рендеринг', () => {
    it('рендерит числовое поле', () => {
      render(
        <Form initialValue={{ discount: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Percentage name="discount" label="Скидка" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Скидка')).toBeInTheDocument()
      // NumberInput рендерит spinbutton
      expect(screen.getByRole('spinbutton')).toBeInTheDocument()
    })

    it('устанавливает data-field-name', () => {
      const { container } = render(
        <Form initialValue={{ discount: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Percentage name="discount" />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = container.querySelector('[data-field-name="discount"]')
      expect(input).toBeInTheDocument()
    })
  })

  describe('состояния', () => {
    it('рендерит в disabled состоянии', () => {
      render(
        <Form initialValue={{ discount: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Percentage name="discount" disabled />
        </Form>,
        { wrapper: TestWrapper },
      )

      const input = screen.getByRole('spinbutton')
      expect(input).toBeDisabled()
    })

    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ discount: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Percentage name="discount" helperText="От 0 до 100" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('От 0 до 100')).toBeInTheDocument()
    })
  })
})
