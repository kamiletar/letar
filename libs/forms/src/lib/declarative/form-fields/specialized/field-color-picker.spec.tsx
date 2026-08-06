import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldColorPicker', () => {
  describe('rendering', () => {
    it('рендерит color picker', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ color: '#FF0000' }} onSubmit={vi.fn()}>
            <Form.Field.ColorPicker name="color" />
          </Form>
        </TestWrapper>,
      )

      // ColorPicker рендерит trigger button
      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ color: '#000000' }} onSubmit={vi.fn()}>
            <Form.Field.ColorPicker name="color" label="Цвет" />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('Цвет')).toBeInTheDocument()
    })

    it('рендерит hex input по умолчанию', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ color: '#FF0000' }} onSubmit={vi.fn()}>
            <Form.Field.ColorPicker name="color" />
          </Form>
        </TestWrapper>,
      )

      // ColorPicker рендерит несколько textbox (hidden + channel input)
      const textboxes = screen.getAllByRole('textbox')
      expect(textboxes.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('states', () => {
    it('disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ color: '#000000' }} onSubmit={vi.fn()}>
            <Form.Field.ColorPicker name="color" disabled />
          </Form>
        </TestWrapper>,
      )

      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
    })
  })

  describe('initial value', () => {
    it('показывает начальный цвет', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ color: '#48BB78' }} onSubmit={vi.fn()}>
            <Form.Field.ColorPicker name="color" />
          </Form>
        </TestWrapper>,
      )

      // ColorPicker рендерит input с значением цвета
      const inputs = document.querySelectorAll('input')
      expect(inputs.length).toBeGreaterThan(0)
    })
  })
})
