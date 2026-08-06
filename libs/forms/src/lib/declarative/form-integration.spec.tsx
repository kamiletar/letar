import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { Form, useDeclarativeForm } from './'
import { FieldCheckbox, FieldNumber, FieldString } from './form-fields'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('Form + Field Integration', () => {
  it('должен рендерить форму с несколькими полями', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ name: '', age: 18 }} onSubmit={vi.fn()}>
          <FieldString name="name" label="Имя" />
          <FieldNumber name="age" label="Возраст" />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Имя')).toBeInTheDocument()
      expect(screen.getByText('Возраст')).toBeInTheDocument()
    })
  })

  it('должен отображать начальные значения', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ name: 'Иван', age: 25 }} onSubmit={vi.fn()}>
          <FieldString name="name" label="Имя" />
          <FieldNumber name="age" label="Возраст" />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      // Проверяем что поля имеют начальные значения
      expect(screen.getByDisplayValue('Иван')).toBeInTheDocument()
    })
  })

  it('должен предоставлять доступ к form API через useDeclarativeForm', async () => {
    const FormInfo = () => {
      const ctx = useDeclarativeForm()
      return <span data-testid="has-form">{ctx.form ? 'yes' : 'no'}</span>
    }

    render(
      <TestWrapper>
        <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
          <FormInfo />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('has-form')).toHaveTextContent('yes')
    })
  })

  it('должен работать с disabled режимом', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ name: '' }} onSubmit={vi.fn()} disabled>
          <FieldString name="name" label="Имя" />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      // Поле должно быть отключено
      const input = screen.getByRole('textbox')
      expect(input).toBeDisabled()
    })
  })

  it('должен рендерить checkbox поля', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ agree: false }} onSubmit={vi.fn()}>
          <FieldCheckbox name="agree" label="Согласен" />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Согласен')).toBeInTheDocument()
    })
  })
})
