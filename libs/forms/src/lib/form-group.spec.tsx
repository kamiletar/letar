import { render, screen } from '@testing-library/react'
import { FormGroup, useFormGroup } from './form-group'

describe('FormGroup', () => {
  it('должен предоставить имя группы через контекст', () => {
    // Arrange
    const TestComponent = () => {
      const ctx = useFormGroup()
      return <span data-testid="name">{ctx?.name}</span>
    }

    // Act
    render(
      <FormGroup name="user">
        <TestComponent />
      </FormGroup>
    )

    // Assert
    expect(screen.getByTestId('name')).toHaveTextContent('user')
  })

  it('должен объединять вложенные имена через точку', () => {
    const TestComponent = () => {
      const ctx = useFormGroup()
      return <span data-testid="name">{ctx?.name}</span>
    }

    render(
      <FormGroup name="user">
        <FormGroup name="address">
          <TestComponent />
        </FormGroup>
      </FormGroup>
    )

    expect(screen.getByTestId('name')).toHaveTextContent('user.address')
  })

  it('должен возвращать null вне контекста', () => {
    const TestComponent = () => {
      const ctx = useFormGroup()
      return <span data-testid="name">{ctx === null ? 'null' : ctx.name}</span>
    }

    render(<TestComponent />)

    expect(screen.getByTestId('name')).toHaveTextContent('null')
  })

  it('должен предоставлять originalName', () => {
    const TestComponent = () => {
      const ctx = useFormGroup()
      return <span data-testid="original">{ctx?.originalName}</span>
    }

    render(
      <FormGroup name="user">
        <FormGroup name="address">
          <TestComponent />
        </FormGroup>
      </FormGroup>
    )

    expect(screen.getByTestId('original')).toHaveTextContent('address')
  })
})
