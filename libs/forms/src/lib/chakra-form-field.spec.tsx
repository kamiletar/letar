import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import type { AnyFieldApi } from '@tanstack/react-form'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { ChakraFormField } from './chakra-form-field'
import { TanStackFormField } from './tanstack-form-field'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('ChakraFormField', () => {
  const createMockField = (value = '', errors: string[] = []): AnyFieldApi =>
    ({
      state: { value, meta: { errors } },
      handleChange: vi.fn(),
      handleBlur: vi.fn(),
    }) as unknown as AnyFieldApi

  it('должен отображать label', () => {
    const mockField = createMockField()

    render(
      <TestWrapper>
        <TanStackFormField name="email" field={mockField}>
          <ChakraFormField label="Email">
            <input data-testid="input" />
          </ChakraFormField>
        </TanStackFormField>
      </TestWrapper>
    )

    expect(screen.getByText('Email')).toBeInTheDocument()
  })

  it('должен отображать helperText когда нет ошибок', () => {
    const mockField = createMockField()

    render(
      <TestWrapper>
        <TanStackFormField name="email" field={mockField}>
          <ChakraFormField label="Email" helperText="Рабочий email">
            <input data-testid="input" />
          </ChakraFormField>
        </TanStackFormField>
      </TestWrapper>
    )

    expect(screen.getByText('Рабочий email')).toBeInTheDocument()
  })

  it('должен отображать ошибки из field API', () => {
    const mockField = createMockField('', ['Некорректный email'])

    render(
      <TestWrapper>
        <TanStackFormField name="email" field={mockField}>
          <ChakraFormField label="Email">
            <input data-testid="input" />
          </ChakraFormField>
        </TanStackFormField>
      </TestWrapper>
    )

    expect(screen.getByText('Некорректный email')).toBeInTheDocument()
  })

  it('должен скрывать helperText при наличии ошибок', () => {
    const mockField = createMockField('', ['Ошибка'])

    render(
      <TestWrapper>
        <TanStackFormField name="email" field={mockField}>
          <ChakraFormField label="Email" helperText="Подсказка">
            <input data-testid="input" />
          </ChakraFormField>
        </TanStackFormField>
      </TestWrapper>
    )

    expect(screen.queryByText('Подсказка')).not.toBeInTheDocument()
    expect(screen.getByText('Ошибка')).toBeInTheDocument()
  })

  it('должен рендерить children', () => {
    const mockField = createMockField()

    render(
      <TestWrapper>
        <TanStackFormField name="email" field={mockField}>
          <ChakraFormField label="Email">
            <input data-testid="custom-input" />
          </ChakraFormField>
        </TanStackFormField>
      </TestWrapper>
    )

    expect(screen.getByTestId('custom-input')).toBeInTheDocument()
  })

  it('должен использовать кастомный errorText', () => {
    const mockField = createMockField('', ['Original error'])

    render(
      <TestWrapper>
        <TanStackFormField name="email" field={mockField}>
          <ChakraFormField label="Email" errorText="Кастомная ошибка">
            <input data-testid="input" />
          </ChakraFormField>
        </TanStackFormField>
      </TestWrapper>
    )

    expect(screen.getByText('Кастомная ошибка')).toBeInTheDocument()
    expect(screen.queryByText('Original error')).not.toBeInTheDocument()
  })
})
