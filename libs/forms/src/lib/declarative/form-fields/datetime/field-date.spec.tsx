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

// Хелпер для получения date input (не имеет role="textbox")
const getDateInput = () => document.querySelector('input[type="date"]') as HTMLInputElement

describe('FieldDate', () => {
  describe('rendering', () => {
    it('рендерит date input', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ date: '' }} onSubmit={vi.fn()}>
            <Form.Field.Date name="date" />
          </Form>
        </TestWrapper>
      )

      const input = getDateInput()
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'date')
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ birthDate: '' }} onSubmit={vi.fn()}>
            <Form.Field.Date name="birthDate" label="Дата рождения" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Дата рождения')).toBeInTheDocument()
    })

    it('рендерит placeholder', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ eventDate: '' }} onSubmit={vi.fn()}>
            <Form.Field.Date name="eventDate" placeholder="Выберите дату" />
          </Form>
        </TestWrapper>
      )

      const input = getDateInput()
      expect(input).toHaveAttribute('placeholder', 'Выберите дату')
    })
  })

  describe('value display', () => {
    it('показывает строковое значение даты', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ date: '2024-06-15' }} onSubmit={vi.fn()}>
            <Form.Field.Date name="date" />
          </Form>
        </TestWrapper>
      )

      expect(getDateInput()).toHaveValue('2024-06-15')
    })

    it('конвертирует Date объект в строку', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ date: new Date('2024-03-20') }} onSubmit={vi.fn()}>
            <Form.Field.Date name="date" />
          </Form>
        </TestWrapper>
      )

      expect(getDateInput()).toHaveValue('2024-03-20')
    })

    it('обрабатывает пустое значение', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ date: '' }} onSubmit={vi.fn()}>
            <Form.Field.Date name="date" />
          </Form>
        </TestWrapper>
      )

      expect(getDateInput()).toHaveValue('')
    })
  })

  describe('constraints', () => {
    it('применяет min', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ date: '' }} onSubmit={vi.fn()}>
            <Form.Field.Date name="date" min="2024-01-01" />
          </Form>
        </TestWrapper>
      )

      expect(getDateInput()).toHaveAttribute('min', '2024-01-01')
    })

    it('применяет max', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ date: '' }} onSubmit={vi.fn()}>
            <Form.Field.Date name="date" max="2024-12-31" />
          </Form>
        </TestWrapper>
      )

      expect(getDateInput()).toHaveAttribute('max', '2024-12-31')
    })

    it('применяет min и max вместе', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ date: '' }} onSubmit={vi.fn()}>
            <Form.Field.Date name="date" min="2024-01-01" max="2024-12-31" />
          </Form>
        </TestWrapper>
      )

      const input = getDateInput()
      expect(input).toHaveAttribute('min', '2024-01-01')
      expect(input).toHaveAttribute('max', '2024-12-31')
    })
  })

  describe('states', () => {
    it('поддерживает disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ date: '' }} onSubmit={vi.fn()}>
            <Form.Field.Date name="date" disabled />
          </Form>
        </TestWrapper>
      )

      expect(getDateInput()).toBeDisabled()
    })

    it('показывает required индикатор', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ date: '' }} onSubmit={vi.fn()}>
            <Form.Field.Date name="date" label="Date" required />
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
          <Form initialValue={{ date: '' }} onSubmit={vi.fn()}>
            <Form.Field.Date name="date" />
          </Form>
        </TestWrapper>
      )

      const input = getDateInput()
      // Для date input используем fireEvent вместо userEvent.type
      await userEvent.clear(input)
      await userEvent.type(input, '2024-07-04')

      expect(input).toHaveValue('2024-07-04')
    })
  })

  describe('data attributes', () => {
    it('устанавливает data-field-name', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ eventDate: '' }} onSubmit={vi.fn()}>
            <Form.Field.Date name="eventDate" />
          </Form>
        </TestWrapper>
      )

      expect(getDateInput()).toHaveAttribute('data-field-name', 'eventDate')
    })
  })
})
