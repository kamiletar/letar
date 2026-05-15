import { render, screen } from '@testing-library/react'
import { FormField, useFormField } from './form-field'
import { FormGroup } from './form-group'

describe('FormField', () => {
  it('должен предоставить имя поля через контекст', () => {
    const TestComponent = () => {
      const ctx = useFormField()
      return <span data-testid="name">{ctx?.name}</span>
    }

    render(
      <FormField name="email">
        <TestComponent />
      </FormField>
    )

    expect(screen.getByTestId('name')).toHaveTextContent('email')
  })

  it('должен объединять с именем группы', () => {
    const TestComponent = () => {
      const ctx = useFormField()
      return <span data-testid="name">{ctx?.name}</span>
    }

    render(
      <FormGroup name="user">
        <FormField name="email">
          <TestComponent />
        </FormField>
      </FormGroup>
    )

    expect(screen.getByTestId('name')).toHaveTextContent('user.email')
  })

  it('должен поддерживать render prop паттерн', () => {
    render(<FormField name="email">{({ name }) => <span data-testid="name">{name}</span>}</FormField>)

    expect(screen.getByTestId('name')).toHaveTextContent('email')
  })

  it('должен возвращать null вне контекста', () => {
    const TestComponent = () => {
      const ctx = useFormField()
      return <span data-testid="name">{ctx === null ? 'null' : ctx.name}</span>
    }

    render(<TestComponent />)

    expect(screen.getByTestId('name')).toHaveTextContent('null')
  })

  it('должен предоставлять originalName', () => {
    const TestComponent = () => {
      const ctx = useFormField()
      return <span data-testid="original">{ctx?.originalName}</span>
    }

    render(
      <FormGroup name="user">
        <FormField name="email">
          <TestComponent />
        </FormField>
      </FormGroup>
    )

    expect(screen.getByTestId('original')).toHaveTextContent('email')
  })

  it('должен объединять вложенные группы с полем', () => {
    render(
      <FormGroup name="user">
        <FormGroup name="address">
          <FormField name="city">{({ name }) => <span data-testid="name">{name}</span>}</FormField>
        </FormGroup>
      </FormGroup>
    )

    expect(screen.getByTestId('name')).toHaveTextContent('user.address.city')
  })
})
