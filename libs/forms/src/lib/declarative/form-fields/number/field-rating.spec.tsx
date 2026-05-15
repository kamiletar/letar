import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldRating', () => {
  describe('rendering', () => {
    it('рендерит rating group', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ rating: 0 }} onSubmit={vi.fn()}>
            <Form.Field.Rating name="rating" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ rating: 0 }} onSubmit={vi.fn()}>
            <Form.Field.Rating name="rating" label="Оценка" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Оценка')).toBeInTheDocument()
    })

    it('рендерит 5 звёзд по умолчанию', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ rating: 0 }} onSubmit={vi.fn()}>
            <Form.Field.Rating name="rating" />
          </Form>
        </TestWrapper>
      )

      const radios = screen.getAllByRole('radio')
      expect(radios.length).toBe(5)
    })

    it('рендерит кастомное количество звёзд', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ rating: 0 }} onSubmit={vi.fn()}>
            <Form.Field.Rating name="rating" count={10} />
          </Form>
        </TestWrapper>
      )

      const radios = screen.getAllByRole('radio')
      expect(radios.length).toBe(10)
    })
  })

  describe('states', () => {
    it('disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ rating: 3 }} onSubmit={vi.fn()}>
            <Form.Field.Rating name="rating" disabled />
          </Form>
        </TestWrapper>
      )

      const group = screen.getByRole('radiogroup')
      expect(group).toHaveAttribute('data-disabled', '')
    })

    it('readOnly', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ rating: 3 }} onSubmit={vi.fn()}>
            <Form.Field.Rating name="rating" readOnly />
          </Form>
        </TestWrapper>
      )

      const group = screen.getByRole('radiogroup')
      expect(group).toHaveAttribute('data-readonly', '')
    })
  })
})
