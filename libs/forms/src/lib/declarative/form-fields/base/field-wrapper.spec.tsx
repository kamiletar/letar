import { ChakraProvider, defaultSystem, Input } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import type { ResolvedFieldProps } from './create-field'
import { FieldWrapper } from './field-wrapper'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// Базовые resolved props для тестов
const baseResolved: ResolvedFieldProps = {
  label: undefined,
  placeholder: undefined,
  helperText: undefined,
  tooltip: undefined,
  required: undefined,
  disabled: undefined,
  readOnly: undefined,
  constraints: {},
}

describe('FieldWrapper', () => {
  describe('label rendering', () => {
    it('рендерит label когда указан', () => {
      const resolved: ResolvedFieldProps = { ...baseResolved, label: 'Имя пользователя' }

      render(
        <TestWrapper>
          <FieldWrapper resolved={resolved} hasError={false} errorMessage="" fullPath="name">
            <Input />
          </FieldWrapper>
        </TestWrapper>,
      )

      expect(screen.getByText('Имя пользователя')).toBeInTheDocument()
    })

    it('не рендерит label когда не указан', () => {
      render(
        <TestWrapper>
          <FieldWrapper resolved={baseResolved} hasError={false} errorMessage="" fullPath="name">
            <Input data-testid="input" />
          </FieldWrapper>
        </TestWrapper>,
      )

      expect(screen.getByTestId('input')).toBeInTheDocument()
      // Не должно быть элемента label
      expect(screen.queryByRole('label')).not.toBeInTheDocument()
    })
  })

  describe('required indicator', () => {
    it('показывает индикатор обязательного поля', () => {
      const resolved: ResolvedFieldProps = { ...baseResolved, label: 'Email', required: true }

      render(
        <TestWrapper>
          <FieldWrapper resolved={resolved} hasError={false} errorMessage="" fullPath="email">
            <Input />
          </FieldWrapper>
        </TestWrapper>,
      )

      // Chakra UI добавляет "*" для required полей
      expect(screen.getByText('Email')).toBeInTheDocument()
      // Должен быть индикатор обязательности (звёздочка)
      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })

  describe('disabled state', () => {
    it('устанавливает disabled на Field.Root', () => {
      const resolved: ResolvedFieldProps = { ...baseResolved, label: 'Name', disabled: true }

      render(
        <TestWrapper>
          <FieldWrapper resolved={resolved} hasError={false} errorMessage="" fullPath="name">
            <Input data-testid="input" />
          </FieldWrapper>
        </TestWrapper>,
      )

      const fieldRoot = screen.getByRole('group')
      expect(fieldRoot).toHaveAttribute('data-disabled', '')
    })
  })

  describe('readOnly state', () => {
    it('устанавливает readOnly на Field.Root', () => {
      const resolved: ResolvedFieldProps = { ...baseResolved, label: 'Name', readOnly: true }

      render(
        <TestWrapper>
          <FieldWrapper resolved={resolved} hasError={false} errorMessage="" fullPath="name">
            <Input data-testid="input" />
          </FieldWrapper>
        </TestWrapper>,
      )

      const fieldRoot = screen.getByRole('group')
      expect(fieldRoot).toHaveAttribute('data-readonly', '')
    })
  })

  describe('error display', () => {
    it('показывает ошибку когда hasError=true', () => {
      const resolved: ResolvedFieldProps = { ...baseResolved, label: 'Email' }

      render(
        <TestWrapper>
          <FieldWrapper resolved={resolved} hasError={true} errorMessage="Неверный email" fullPath="email">
            <Input />
          </FieldWrapper>
        </TestWrapper>,
      )

      expect(screen.getByText('Неверный email')).toBeInTheDocument()
    })

    it('устанавливает invalid на Field.Root при ошибке', () => {
      const resolved: ResolvedFieldProps = { ...baseResolved, label: 'Email' }

      render(
        <TestWrapper>
          <FieldWrapper resolved={resolved} hasError={true} errorMessage="Ошибка" fullPath="email">
            <Input />
          </FieldWrapper>
        </TestWrapper>,
      )

      const fieldRoot = screen.getByRole('group')
      expect(fieldRoot).toHaveAttribute('data-invalid', '')
    })
  })

  describe('helperText display', () => {
    it('показывает helperText когда нет ошибки', () => {
      const resolved: ResolvedFieldProps = { ...baseResolved, label: 'Password', helperText: 'Минимум 8 символов' }

      render(
        <TestWrapper>
          <FieldWrapper resolved={resolved} hasError={false} errorMessage="" fullPath="password">
            <Input />
          </FieldWrapper>
        </TestWrapper>,
      )

      expect(screen.getByText('Минимум 8 символов')).toBeInTheDocument()
    })

    it('ошибка имеет приоритет над helperText', () => {
      const resolved: ResolvedFieldProps = {
        ...baseResolved,
        label: 'Password',
        helperText: 'Подсказка',
      }

      render(
        <TestWrapper>
          <FieldWrapper resolved={resolved} hasError={true} errorMessage="Ошибка валидации" fullPath="password">
            <Input />
          </FieldWrapper>
        </TestWrapper>,
      )

      expect(screen.getByText('Ошибка валидации')).toBeInTheDocument()
      expect(screen.queryByText('Подсказка')).not.toBeInTheDocument()
    })
  })

  describe('children rendering', () => {
    it('рендерит children между label и error', () => {
      const resolved: ResolvedFieldProps = { ...baseResolved, label: 'Name' }

      render(
        <TestWrapper>
          <FieldWrapper resolved={resolved} hasError={false} errorMessage="" fullPath="name">
            <Input data-testid="custom-input" />
          </FieldWrapper>
        </TestWrapper>,
      )

      expect(screen.getByTestId('custom-input')).toBeInTheDocument()
    })

    it('поддерживает сложные children', () => {
      const resolved: ResolvedFieldProps = { ...baseResolved, label: 'Complex Field' }

      render(
        <TestWrapper>
          <FieldWrapper resolved={resolved} hasError={false} errorMessage="" fullPath="complex">
            <div data-testid="wrapper">
              <Input data-testid="input-1" />
              <Input data-testid="input-2" />
            </div>
          </FieldWrapper>
        </TestWrapper>,
      )

      expect(screen.getByTestId('wrapper')).toBeInTheDocument()
      expect(screen.getByTestId('input-1')).toBeInTheDocument()
      expect(screen.getByTestId('input-2')).toBeInTheDocument()
    })
  })

  describe('tooltip support', () => {
    it('передаёт tooltip в FieldLabel', () => {
      const resolved: ResolvedFieldProps = {
        ...baseResolved,
        label: 'With Tooltip',
        tooltip: { content: 'Подсказка в тултипе' },
      }

      const { container } = render(
        <TestWrapper>
          <FieldWrapper resolved={resolved} hasError={false} errorMessage="" fullPath="field">
            <Input />
          </FieldWrapper>
        </TestWrapper>,
      )

      // Tooltip иконка должна быть рядом с label
      expect(screen.getByText('With Tooltip')).toBeInTheDocument()
      // SVG иконка вопроса для tooltip
      const svgIcon = container.querySelector('svg')
      expect(svgIcon).toBeInTheDocument()
    })
  })
})
