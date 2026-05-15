import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { describe, expect, it } from 'vitest'
import { DeclarativeFormContext } from './form-context'
import { FormErrors } from './form-errors'
import type { DeclarativeFormContextValue } from './types'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// Создаём мок контекста формы с Subscribe
// Subscribe в реальном компоненте получает selector и передаёт результат в children
function createMockFormContext(errors: unknown[] = [], submissionAttempts = 1): DeclarativeFormContextValue {
  return {
    form: {
      Subscribe: ({
        children,
        selector,
      }: {
        children: (state: { errors: unknown[]; submissionAttempts: number }) => ReactNode
        selector?: (state: { errors: unknown[]; submissionAttempts: number }) => {
          errors: unknown[]
          submissionAttempts: number
        }
      }) => {
        const state = { errors, submissionAttempts }
        const selected = selector ? selector(state) : state
        return createElement('div', null, children(selected))
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    apiState: undefined,
  }
}

// Обёртка с контекстом формы
function createContextWrapper(context: DeclarativeFormContextValue) {
  return ({ children }: { children: ReactNode }) =>
    createElement(TestWrapper, null, createElement(DeclarativeFormContext.Provider, { value: context }, children))
}

describe('FormErrors', () => {
  describe('rendering', () => {
    it('не рендерит ничего когда нет ошибок', () => {
      const context = createMockFormContext([])
      const wrapper = createContextWrapper(context)

      const { container } = render(<FormErrors />, { wrapper })

      // Alert не должен появиться
      expect(container.querySelector('[data-status="error"]')).not.toBeInTheDocument()
    })

    it('рендерит Alert при наличии ошибок', () => {
      const context = createMockFormContext([{ email: [{ message: 'Некорректный email' }] }])
      const wrapper = createContextWrapper(context)

      render(<FormErrors />, { wrapper })

      expect(screen.getByText(/Некорректный email/)).toBeInTheDocument()
    })

    it('показывает заголовок по умолчанию', () => {
      const context = createMockFormContext([{ name: [{ message: 'Required' }] }])
      const wrapper = createContextWrapper(context)

      render(<FormErrors />, { wrapper })

      expect(screen.getByText('Please fix the following errors:')).toBeInTheDocument()
    })

    it('показывает кастомный заголовок', () => {
      const context = createMockFormContext([{ name: [{ message: 'Required' }] }])
      const wrapper = createContextWrapper(context)

      render(<FormErrors title="Пожалуйста, исправьте ошибки:" />, { wrapper })

      expect(screen.getByText('Пожалуйста, исправьте ошибки:')).toBeInTheDocument()
    })
  })

  describe('error extraction', () => {
    it('извлекает ошибки из объекта полей', () => {
      const context = createMockFormContext([
        {
          email: [{ message: 'Некорректный email' }],
          password: [{ message: 'Минимум 8 символов' }],
        },
      ])
      const wrapper = createContextWrapper(context)

      render(<FormErrors />, { wrapper })

      expect(screen.getByText(/email: Некорректный email/)).toBeInTheDocument()
      expect(screen.getByText(/password: Минимум 8 символов/)).toBeInTheDocument()
    })

    it('извлекает строковые ошибки', () => {
      const context = createMockFormContext(['Общая ошибка формы'])
      const wrapper = createContextWrapper(context)

      render(<FormErrors />, { wrapper })

      expect(screen.getByText('Общая ошибка формы')).toBeInTheDocument()
    })

    it('игнорирует null/undefined ошибки', () => {
      const context = createMockFormContext([null, undefined, { name: [{ message: 'Valid error' }] }])
      const wrapper = createContextWrapper(context)

      render(<FormErrors />, { wrapper })

      expect(screen.getByText(/Valid error/)).toBeInTheDocument()
    })

    it('игнорирует пустые строки', () => {
      const context = createMockFormContext(['', '   ', 'Valid error'])
      const wrapper = createContextWrapper(context)

      render(<FormErrors />, { wrapper })

      // Должен быть только один li элемент
      const listItems = screen.getAllByRole('listitem')
      expect(listItems.length).toBe(1)
      expect(screen.getByText('Valid error')).toBeInTheDocument()
    })
  })

  describe('server error', () => {
    it('показывает ошибку сервера', () => {
      const context: DeclarativeFormContextValue = {
        form: {
          Subscribe: ({
            children,
            selector,
          }: {
            children: (state: { errors: unknown[]; submissionAttempts: number }) => ReactNode
            selector?: (state: { errors: unknown[]; submissionAttempts: number }) => {
              errors: unknown[]
              submissionAttempts: number
            }
          }) => {
            const state = { errors: [] as unknown[], submissionAttempts: 1 }
            const selected = selector ? selector(state) : state
            return createElement('div', null, children(selected))
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        apiState: {
          mutationError: { message: 'Server error occurred' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }
      const wrapper = createContextWrapper(context)

      render(<FormErrors />, { wrapper })

      expect(screen.getByText('Server error occurred')).toBeInTheDocument()
    })

    it('показывает ошибку сервера вместе с ошибками валидации', () => {
      const context: DeclarativeFormContextValue = {
        form: {
          Subscribe: ({
            children,
            selector,
          }: {
            children: (state: { errors: unknown[]; submissionAttempts: number }) => ReactNode
            selector?: (state: { errors: unknown[]; submissionAttempts: number }) => {
              errors: unknown[]
              submissionAttempts: number
            }
          }) => {
            const state = { errors: [{ email: [{ message: 'Invalid email' }] }] as unknown[], submissionAttempts: 1 }
            const selected = selector ? selector(state) : state
            return createElement('div', null, children(selected))
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
        apiState: {
          mutationError: { message: 'Server unavailable' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any,
      }
      const wrapper = createContextWrapper(context)

      render(<FormErrors />, { wrapper })

      expect(screen.getByText('Server unavailable')).toBeInTheDocument()
      expect(screen.getByText(/Invalid email/)).toBeInTheDocument()
    })
  })
})
