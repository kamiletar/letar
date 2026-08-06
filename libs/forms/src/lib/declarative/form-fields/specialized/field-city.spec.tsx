import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldCity', () => {
  describe('rendering', () => {
    it('рендерит input для города', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
            <Form.Field.City name="city" />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
            <Form.Field.City name="city" label="Город" />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('Город')).toBeInTheDocument()
    })

    it('рендерит placeholder', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
            <Form.Field.City name="city" placeholder="Введите город" />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByPlaceholderText('Введите город')).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
            <Form.Field.City name="city" disabled />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })
})
