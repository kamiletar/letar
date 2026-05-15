import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldAddress', () => {
  describe('rendering', () => {
    it('рендерит input для адреса', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ address: '' }} onSubmit={vi.fn()}>
            <Form.Field.Address name="address" />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ address: '' }} onSubmit={vi.fn()}>
            <Form.Field.Address name="address" label="Адрес" />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('Адрес')).toBeInTheDocument()
    })

    it('рендерит placeholder', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ address: '' }} onSubmit={vi.fn()}>
            <Form.Field.Address name="address" placeholder="Начните ввод адреса..." />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByPlaceholderText('Начните ввод адреса...')).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ address: '' }} onSubmit={vi.fn()}>
            <Form.Field.Address name="address" disabled />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })
})
