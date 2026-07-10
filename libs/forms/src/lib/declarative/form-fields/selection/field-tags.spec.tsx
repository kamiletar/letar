import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldTags', () => {
  describe('rendering', () => {
    it('рендерит tags input', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ tags: [] }} onSubmit={vi.fn()}>
            <Form.Field.Tags name="tags" />
          </Form>
        </TestWrapper>
      )

      // TagsInput рендерит input для ввода тегов
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ tags: [] }} onSubmit={vi.fn()}>
            <Form.Field.Tags name="tags" label="Теги" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Теги')).toBeInTheDocument()
    })

    it('показывает начальные теги', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ tags: ['React', 'TypeScript'] }} onSubmit={vi.fn()}>
            <Form.Field.Tags name="tags" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('React')).toBeInTheDocument()
      expect(screen.getByText('TypeScript')).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ tags: [] }} onSubmit={vi.fn()}>
            <Form.Field.Tags name="tags" disabled />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('textbox')).toBeDisabled()
    })
  })
})
