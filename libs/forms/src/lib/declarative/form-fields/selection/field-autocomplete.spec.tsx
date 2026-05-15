import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldAutocomplete', () => {
  const suggestions = ['Москва', 'Минск', 'Магадан']

  describe('rendering', () => {
    it('рендерит autocomplete input', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
            <Form.Field.Autocomplete name="city" suggestions={suggestions} />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
            <Form.Field.Autocomplete name="city" label="Город" suggestions={suggestions} />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Город')).toBeInTheDocument()
    })

    it('рендерит placeholder', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
            <Form.Field.Autocomplete name="city" placeholder="Начните ввод..." suggestions={suggestions} />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('Начните ввод...')).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ city: '' }} onSubmit={vi.fn()}>
            <Form.Field.Autocomplete name="city" suggestions={suggestions} disabled />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('combobox')).toBeDisabled()
    })
  })
})
