import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useTypedFormContext, useTypedFormSubscribe } from './context'
import { Form } from './declarative'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

interface Settings {
  fontSize: number
}

// Регрессионные тесты на баг из коммита 207e25b7: useTypedFormContext/
// useTypedFormSubscribe читали TanStack useDeclarativeForm() из
// './declarative/form-context', а не raw TanStack useFormContext() — это
// не тот класс бага, что у остальных четырёх API (они падали при вызове ВНЕ
// form.AppForm), но именно поэтому важно проверить их живьём внутри
// настоящего декларативного <Form>, а не мок-контекстом.
describe('useTypedFormContext (внутри декларативного <Form>)', () => {
  function LivePreview() {
    const { values, form } = useTypedFormContext<Settings>()

    return (
      <form.Subscribe selector={(s: { values: unknown }) => values(s)}>
        {(settings: Settings) => <div data-testid="preview">{settings.fontSize}</div>}
      </form.Subscribe>
    )
  }

  it('рендерится без throw и отдаёт типизированный снимок значений', () => {
    render(
      <TestWrapper>
        <Form initialValue={{ fontSize: 14 }} onSubmit={vi.fn()}>
          <Form.Field.Number name="fontSize" label="Размер шрифта" />
          <LivePreview />
        </Form>
      </TestWrapper>,
    )

    expect(screen.getByTestId('preview')).toHaveTextContent('14')
  })

  it('реагирует на изменение значения поля', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={{ fontSize: 14 }} onSubmit={vi.fn()}>
          <Form.Field.Number name="fontSize" label="Размер шрифта" />
          <LivePreview />
        </Form>
      </TestWrapper>,
    )

    const input = screen.getByLabelText('Размер шрифта')
    await user.clear(input)
    await user.type(input, '20')

    await waitFor(() => {
      expect(screen.getByTestId('preview')).toHaveTextContent('20')
    })
  })

  it('typedSetFieldValue меняет значение поля программно', async () => {
    function Controls() {
      const { setFieldValue } = useTypedFormContext<Settings>()
      return (
        <button type="button" onClick={() => setFieldValue('fontSize', 42)}>
          Установить 42
        </button>
      )
    }

    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={{ fontSize: 14 }} onSubmit={vi.fn()}>
          <Form.Field.Number name="fontSize" label="Размер шрифта" />
          <Controls />
          <LivePreview />
        </Form>
      </TestWrapper>,
    )

    await user.click(screen.getByText('Установить 42'))

    await waitFor(() => {
      expect(screen.getByTestId('preview')).toHaveTextContent('42')
    })
  })
})

describe('useTypedFormSubscribe (внутри декларативного <Form>)', () => {
  function LivePreview() {
    const { TypedSubscribe } = useTypedFormSubscribe<Settings>()
    return (
      <TypedSubscribe selector={(values) => values.fontSize}>
        {(fontSize) => <div data-testid="preview">{fontSize}</div>}
      </TypedSubscribe>
    )
  }

  it('рендерится без throw и показывает выбранное значение', () => {
    render(
      <TestWrapper>
        <Form initialValue={{ fontSize: 16 }} onSubmit={vi.fn()}>
          <Form.Field.Number name="fontSize" label="Размер шрифта" />
          <LivePreview />
        </Form>
      </TestWrapper>,
    )

    expect(screen.getByTestId('preview')).toHaveTextContent('16')
  })

  it('реагирует на изменение значения поля', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={{ fontSize: 16 }} onSubmit={vi.fn()}>
          <Form.Field.Number name="fontSize" label="Размер шрифта" />
          <LivePreview />
        </Form>
      </TestWrapper>,
    )

    const input = screen.getByLabelText('Размер шрифта')
    await user.clear(input)
    await user.type(input, '24')

    await waitFor(() => {
      expect(screen.getByTestId('preview')).toHaveTextContent('24')
    })
  })
})
