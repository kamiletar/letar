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

describe('FieldString', () => {
  describe('rendering', () => {
    it('рендерит input поле', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="name" label="Name" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="name" label="Имя пользователя" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Имя пользователя')).toBeInTheDocument()
    })

    it('рендерит placeholder', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="name" placeholder="Введите имя" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByPlaceholderText('Введите имя')).toBeInTheDocument()
    })

    it('показывает начальное значение', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ name: 'John' }} onSubmit={vi.fn()}>
            <Form.Field.String name="name" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('textbox')).toHaveValue('John')
    })
  })

  describe('input types', () => {
    it('поддерживает type="email"', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ email: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="email" type="email" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'email')
    })

    it('поддерживает type="url"', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ website: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="website" type="url" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'url')
    })

    it('использует type="text" по умолчанию', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="name" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('textbox')).toHaveAttribute('type', 'text')
    })
  })

  describe('constraints', () => {
    it('применяет maxLength', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ title: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="title" maxLength={50} />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('textbox')).toHaveAttribute('maxLength', '50')
    })

    it('применяет minLength', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ password: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="password" minLength={8} />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('textbox')).toHaveAttribute('minLength', '8')
    })

    it('применяет pattern', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ code: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="code" pattern="[A-Z]{3}" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('textbox')).toHaveAttribute('pattern', '[A-Z]{3}')
    })
  })

  describe('states', () => {
    it('поддерживает disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="name" disabled />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('textbox')).toBeDisabled()
    })

    it('показывает required индикатор', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="name" label="Name" required />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })

  describe('user interaction', () => {
    it('обновляет значение при вводе', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="name" />
          </Form>
        </TestWrapper>
      )

      const input = screen.getByRole('textbox')
      await userEvent.type(input, 'Hello')

      expect(input).toHaveValue('Hello')
    })
  })

  describe('data attributes', () => {
    it('устанавливает data-field-name', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ username: '' }} onSubmit={vi.fn()}>
            <Form.Field.String name="username" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByRole('textbox')).toHaveAttribute('data-field-name', 'username')
    })
  })
})
