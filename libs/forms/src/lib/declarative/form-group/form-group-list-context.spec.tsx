import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import type { FormGroupListContextValue, FormGroupListItemContextValue } from '../types'
import {
  FormGroupListContext,
  FormGroupListItemContext,
  useFormGroupListContext,
  useFormGroupListItemContext,
} from './form-group-list-context'

describe('FormGroupListContext', () => {
  const mockListContext: FormGroupListContextValue = {
    values: [{ id: 1 }, { id: 2 }],
    length: 2,
    pushValue: vi.fn(),
    removeValue: vi.fn(),
    moveValue: vi.fn(),
    swapValues: vi.fn(),
    insertValue: vi.fn(),
    replaceValue: vi.fn(),
    resetField: vi.fn(),
  }

  describe('useFormGroupListContext', () => {
    it('должен вернуть контекст списка', () => {
      const TestComponent = () => {
        const ctx = useFormGroupListContext()
        return <span data-testid="length">{ctx.length}</span>
      }

      render(
        <FormGroupListContext.Provider value={mockListContext}>
          <TestComponent />
        </FormGroupListContext.Provider>
      )

      expect(screen.getByTestId('length')).toHaveTextContent('2')
    })

    it('должен выбросить ошибку вне контекста Form.Group.List', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      const TestComponent = () => {
        useFormGroupListContext()
        return <div />
      }

      expect(() => render(<TestComponent />)).toThrow('useFormGroupListContext must be used inside Form.Group.List')

      consoleError.mockRestore()
    })
  })
})

describe('FormGroupListItemContext', () => {
  const mockItemContext: FormGroupListItemContextValue = {
    index: 1,
    isFirst: false,
    isLast: false,
    remove: vi.fn(),
    moveUp: vi.fn(),
    moveDown: vi.fn(),
  }

  describe('useFormGroupListItemContext', () => {
    it('должен вернуть контекст элемента списка', () => {
      const TestComponent = () => {
        const ctx = useFormGroupListItemContext()
        return (
          <>
            <span data-testid="index">{ctx.index}</span>
            <span data-testid="isFirst">{String(ctx.isFirst)}</span>
            <span data-testid="isLast">{String(ctx.isLast)}</span>
          </>
        )
      }

      render(
        <FormGroupListItemContext.Provider value={mockItemContext}>
          <TestComponent />
        </FormGroupListItemContext.Provider>
      )

      expect(screen.getByTestId('index')).toHaveTextContent('1')
      expect(screen.getByTestId('isFirst')).toHaveTextContent('false')
      expect(screen.getByTestId('isLast')).toHaveTextContent('false')
    })

    it('должен выбросить ошибку вне контекста Form.Group.List item', () => {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

      const TestComponent = () => {
        useFormGroupListItemContext()
        return <div />
      }

      expect(() => render(<TestComponent />)).toThrow(
        'useFormGroupListItemContext must be used inside Form.Group.List item'
      )

      consoleError.mockRestore()
    })
  })
})
