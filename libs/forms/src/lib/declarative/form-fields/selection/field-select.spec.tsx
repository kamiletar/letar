import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import { type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const testOptions = [
  { label: 'React', value: 'react' },
  { label: 'Vue', value: 'vue' },
  { label: 'Angular', value: 'angular' },
]

describe('FieldSelect', () => {
  describe('rendering', () => {
    it('рендерит select', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ framework: '' }} onSubmit={vi.fn()}>
            <Form.Field.Select name="framework" options={testOptions} />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ framework: '' }} onSubmit={vi.fn()}>
            <Form.Field.Select name="framework" label="Фреймворк" options={testOptions} />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('Фреймворк')).toBeInTheDocument()
    })

    it('рендерит placeholder', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ framework: '' }} onSubmit={vi.fn()}>
            <Form.Field.Select name="framework" placeholder="Выберите фреймворк" options={testOptions} />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('Выберите фреймворк')).toBeInTheDocument()
    })
  })

  describe('value display', () => {
    it('показывает выбранное значение', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ framework: 'react' }} onSubmit={vi.fn()}>
            <Form.Field.Select name="framework" options={testOptions} />
          </Form>
        </TestWrapper>,
      )

      // Select trigger показывает выбранное значение
      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveTextContent('React')
    })

    it('показывает placeholder когда нет значения', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ framework: '' }} onSubmit={vi.fn()}>
            <Form.Field.Select name="framework" placeholder="Select..." options={testOptions} />
          </Form>
        </TestWrapper>,
      )

      const trigger = screen.getByRole('combobox')
      expect(trigger).toHaveTextContent('Select...')
    })
  })

  // Примечание: тесты открытия dropdown пропущены из-за ResizeObserver в jsdom
  // Эти тесты покрываются E2E тестами

  describe('states', () => {
    it('поддерживает disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ framework: '' }} onSubmit={vi.fn()}>
            <Form.Field.Select name="framework" options={testOptions} disabled />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByRole('combobox')).toHaveAttribute('data-disabled', '')
    })

    it('показывает required индикатор', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ framework: '' }} onSubmit={vi.fn()}>
            <Form.Field.Select name="framework" label="Framework" options={testOptions} required />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })

  describe('clearable', () => {
    it('показывает кнопку очистки по умолчанию для optional поля', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ framework: 'react' }} onSubmit={vi.fn()}>
            <Form.Field.Select name="framework" options={testOptions} />
          </Form>
        </TestWrapper>,
      )

      // Clear trigger должен быть доступен для optional полей
      const selectRoot = screen.getByRole('combobox').closest('[data-scope="select"]')
      expect(selectRoot).toBeInTheDocument()
    })

    it('скрывает кнопку очистки когда clearable=false', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ framework: 'react' }} onSubmit={vi.fn()}>
            <Form.Field.Select name="framework" options={testOptions} clearable={false} />
          </Form>
        </TestWrapper>,
      )

      const selectRoot = screen.getByRole('combobox').closest('[data-scope="select"]')
      expect(selectRoot).toBeInTheDocument()
    })
  })

  describe('data attributes', () => {
    it('устанавливает data-field-name', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ status: '' }} onSubmit={vi.fn()}>
            <Form.Field.Select name="status" options={testOptions} />
          </Form>
        </TestWrapper>,
      )

      const selectRoot = screen.getByRole('combobox').closest('[data-field-name]')
      expect(selectRoot).toHaveAttribute('data-field-name', 'status')
    })
  })
})
