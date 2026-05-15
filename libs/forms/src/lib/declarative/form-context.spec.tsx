import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { DeclarativeFormContext, useDeclarativeForm, useDeclarativeFormOptional } from './form-context'
import type { DeclarativeFormContextValue } from './types'

describe('DeclarativeFormContext', () => {
  const mockContextValue: DeclarativeFormContextValue = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form: {} as any,
  }

  describe('useDeclarativeForm', () => {
    it('должен вернуть контекст формы', () => {
      const TestComponent = () => {
        const ctx = useDeclarativeForm()
        return <span data-testid="form">{ctx.form ? 'has form' : 'no form'}</span>
      }

      render(
        <DeclarativeFormContext.Provider value={mockContextValue}>
          <TestComponent />
        </DeclarativeFormContext.Provider>
      )

      expect(screen.getByTestId('form')).toHaveTextContent('has form')
    })

    it('должен выбросить ошибку вне контекста Form', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      const TestComponent = () => {
        useDeclarativeForm()
        return <div />
      }

      expect(() => render(<TestComponent />)).toThrow('useDeclarativeForm must be used inside a Form component')

      consoleError.mockRestore()
    })
  })

  describe('useDeclarativeFormOptional', () => {
    it('должен вернуть контекст формы', () => {
      const TestComponent = () => {
        const ctx = useDeclarativeFormOptional()
        return <span data-testid="form">{ctx ? 'has form' : 'no form'}</span>
      }

      render(
        <DeclarativeFormContext.Provider value={mockContextValue}>
          <TestComponent />
        </DeclarativeFormContext.Provider>
      )

      expect(screen.getByTestId('form')).toHaveTextContent('has form')
    })

    it('должен вернуть null вне контекста Form', () => {
      const TestComponent = () => {
        const ctx = useDeclarativeFormOptional()
        return <span data-testid="form">{ctx === null ? 'null' : 'has form'}</span>
      }

      render(<TestComponent />)

      expect(screen.getByTestId('form')).toHaveTextContent('null')
    })
  })
})
