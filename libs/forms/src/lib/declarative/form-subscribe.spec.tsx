import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from './'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// Регрессионный тест на баг из коммита 207e25b7: Form.Subscribe читал TanStack
// useFormContext() (createFormHookContexts), который устанавливается только
// form.AppForm, а декларативный <Form> его не рендерит — падение на первом же
// рендере внутри настоящего <Form>.
describe('Form.Subscribe (внутри декларативного <Form>)', () => {
  it('рендерится без throw и показывает текущее значение поля', () => {
    render(
      <TestWrapper>
        <Form initialValue={{ name: 'старт' }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Имя" />
          <Form.Subscribe>{(values) => <div data-testid="preview">{String(values.name)}</div>}</Form.Subscribe>
        </Form>
      </TestWrapper>,
    )

    expect(screen.getByTestId('preview')).toHaveTextContent('старт')
  })

  it('реагирует на изменение значения поля (без debounce)', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Имя" />
          <Form.Subscribe>{(values) => <div data-testid="preview">{String(values.name)}</div>}</Form.Subscribe>
        </Form>
      </TestWrapper>,
    )

    await user.type(screen.getByLabelText('Имя'), 'Ками')

    await waitFor(() => {
      expect(screen.getByTestId('preview')).toHaveTextContent('Ками')
    })
  })

  it('передаёт состояние isDirty/isSubmitting вторым аргументом', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={{ name: '' }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Имя" />
          <Form.Subscribe>
            {(_values, state) => <div data-testid="dirty">{state.isDirty ? 'dirty' : 'clean'}</div>}
          </Form.Subscribe>
        </Form>
      </TestWrapper>,
    )

    expect(screen.getByTestId('dirty')).toHaveTextContent('clean')

    await user.type(screen.getByLabelText('Имя'), 'x')

    await waitFor(() => {
      expect(screen.getByTestId('dirty')).toHaveTextContent('dirty')
    })
  })

  it('с debounce откладывает обновление до истечения задержки', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={{ search: '' }} onSubmit={vi.fn()}>
          <Form.Field.String name="search" label="Поиск" />
          <Form.Subscribe debounce={50}>
            {(values) => <div data-testid="preview">{String(values.search)}</div>}
          </Form.Subscribe>
        </Form>
      </TestWrapper>,
    )

    await user.type(screen.getByLabelText('Поиск'), 'обои')

    await waitFor(
      () => {
        expect(screen.getByTestId('preview')).toHaveTextContent('обои')
      },
      { timeout: 1000 },
    )
  })
})
