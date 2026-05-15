import type { AnyFieldApi } from '@tanstack/react-form'
import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { FormGroup } from './form-group'
import { TanStackFormField, useTanStackFormField } from './tanstack-form-field'

describe('TanStackFormField', () => {
  const createMockField = (value = 'test@example.com'): AnyFieldApi =>
    ({
      state: { value, meta: { errors: [] } },
      handleChange: vi.fn(),
      handleBlur: vi.fn(),
    }) as unknown as AnyFieldApi

  it('должен предоставить field API через контекст', () => {
    const mockField = createMockField()

    const TestComponent = () => {
      const ctx = useTanStackFormField()
      return <span data-testid="value">{ctx?.field.state.value as string}</span>
    }

    render(
      <TanStackFormField name="email" field={mockField}>
        <TestComponent />
      </TanStackFormField>
    )

    expect(screen.getByTestId('value')).toHaveTextContent('test@example.com')
  })

  it('должен объединять имя с FormGroup', () => {
    const mockField = createMockField()

    const TestComponent = () => {
      const ctx = useTanStackFormField()
      return <span data-testid="name">{ctx?.name}</span>
    }

    render(
      <FormGroup name="user">
        <TanStackFormField name="email" field={mockField}>
          <TestComponent />
        </TanStackFormField>
      </FormGroup>
    )

    expect(screen.getByTestId('name')).toHaveTextContent('user.email')
  })

  it('должен поддерживать render prop паттерн', () => {
    const mockField = createMockField()

    render(
      <TanStackFormField name="email" field={mockField}>
        {({ name, field }) => (
          <>
            <span data-testid="name">{name}</span>
            <span data-testid="value">{field.state.value as string}</span>
          </>
        )}
      </TanStackFormField>
    )

    expect(screen.getByTestId('name')).toHaveTextContent('email')
    expect(screen.getByTestId('value')).toHaveTextContent('test@example.com')
  })

  it('должен предоставлять originalName', () => {
    const mockField = createMockField()

    const TestComponent = () => {
      const ctx = useTanStackFormField()
      return <span data-testid="original">{ctx?.originalName}</span>
    }

    render(
      <FormGroup name="user">
        <TanStackFormField name="email" field={mockField}>
          <TestComponent />
        </TanStackFormField>
      </FormGroup>
    )

    expect(screen.getByTestId('original')).toHaveTextContent('email')
  })

  it('должен возвращать null вне контекста', () => {
    const TestComponent = () => {
      const ctx = useTanStackFormField()
      return <span data-testid="ctx">{ctx === null ? 'null' : 'has context'}</span>
    }

    render(<TestComponent />)

    expect(screen.getByTestId('ctx')).toHaveTextContent('null')
  })
})
