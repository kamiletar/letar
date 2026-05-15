import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldCheckbox', () => {
  describe('rendering', () => {
    it('рендерит checkbox', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ agree: false }} onSubmit={vi.fn()}>
            <Form.Field.Checkbox name="agree" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('checkbox')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ agree: false }} onSubmit={vi.fn()}>
            <Form.Field.Checkbox name="agree" label="Я согласен" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Я согласен')).toBeInTheDocument()
    })
  })

  describe('checked state', () => {
    it('показывает checked когда value=true', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ active: true }} onSubmit={vi.fn()}>
            <Form.Field.Checkbox name="active" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('checkbox')).toBeChecked()
    })

    it('показывает unchecked когда value=false', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ active: false }} onSubmit={vi.fn()}>
            <Form.Field.Checkbox name="active" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('checkbox')).not.toBeChecked()
    })
  })

  describe('user interaction', () => {
    it('переключает состояние при клике', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ agree: false }} onSubmit={vi.fn()}>
            <Form.Field.Checkbox name="agree" label="Agree" />
          </Form>
        </TestWrapper>
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).not.toBeChecked()

      await userEvent.click(checkbox)

      expect(checkbox).toBeChecked()
    })

    it('переключает checked → unchecked', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ agree: true }} onSubmit={vi.fn()}>
            <Form.Field.Checkbox name="agree" />
          </Form>
        </TestWrapper>
      )

      const checkbox = screen.getByRole('checkbox')
      expect(checkbox).toBeChecked()

      await userEvent.click(checkbox)

      expect(checkbox).not.toBeChecked()
    })
  })

  describe('states', () => {
    it('поддерживает disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ agree: false }} onSubmit={vi.fn()}>
            <Form.Field.Checkbox name="agree" disabled />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('checkbox')).toBeDisabled()
    })

    it('поддерживает readOnly', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ agree: true }} onSubmit={vi.fn()}>
            <Form.Field.Checkbox name="agree" readOnly />
          </Form>
        </TestWrapper>
      )

      // Chakra Checkbox устанавливает data-readonly на корневой элемент
      const checkboxRoot = screen.getByRole('checkbox').closest('[data-scope="checkbox"]')
      expect(checkboxRoot).toHaveAttribute('data-readonly', '')
    })
  })

  describe('styling', () => {
    it('применяет colorPalette', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ agree: false }} onSubmit={vi.fn()}>
            <Form.Field.Checkbox name="agree" colorPalette="green" />
          </Form>
        </TestWrapper>
      )

      // Chakra устанавливает data-colorpalette атрибут
      const checkboxRoot = screen.getByRole('checkbox').closest('[data-scope="checkbox"]')
      expect(checkboxRoot).toBeInTheDocument()
    })

    it('применяет size', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ agree: false }} onSubmit={vi.fn()}>
            <Form.Field.Checkbox name="agree" size="lg" />
          </Form>
        </TestWrapper>
      )

      const checkboxRoot = screen.getByRole('checkbox').closest('[data-scope="checkbox"]')
      expect(checkboxRoot).toBeInTheDocument()
    })
  })

  describe('data attributes', () => {
    it('устанавливает data-field-name', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ terms: false }} onSubmit={vi.fn()}>
            <Form.Field.Checkbox name="terms" />
          </Form>
        </TestWrapper>
      )

      const checkboxRoot = screen.getByRole('checkbox').closest('[data-field-name]')
      expect(checkboxRoot).toHaveAttribute('data-field-name', 'terms')
    })
  })
})
