import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from '../../'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('Form.Field.Calculated', () => {
  it('вычисляет значение на основе других полей', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={{ price: 10, qty: 2, total: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Number name="price" label="Цена" />
          <Form.Field.Number name="qty" label="Кол-во" />
          <Form.Field.Calculated
            name="total"
            label="Итого"
            compute={(v) => (Number(v.price) || 0) * (Number(v.qty) || 0)}
          />
        </Form>
      </TestWrapper>,
    )

    // Начальное значение: 10 * 2 = 20
    await waitFor(() => {
      expect(screen.getByTestId('calculated-value')).toHaveTextContent('20')
    })
  })

  it('применяет format для отображения', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ price: 1000, qty: 3, total: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Calculated
            name="total"
            label="Итого"
            compute={(v) => (Number(v.price) || 0) * (Number(v.qty) || 0)}
            format={(v) => `${Number(v).toLocaleString('ru-RU')} ₽`}
          />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      const el = screen.getByTestId('calculated-value')
      expect(el.textContent).toContain('₽')
    })
  })

  it('hidden режим не рендерит DOM элемент', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ price: 5, qty: 4, total: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Number name="price" label="Цена" />
          <Form.Field.Calculated name="total" compute={(v) => (Number(v.price) || 0) * (Number(v.qty) || 0)} hidden />
          <Form.DebugValues showInProduction />
        </Form>
      </TestWrapper>,
    )

    // Не должно быть видимого элемента
    expect(screen.queryByTestId('calculated-value')).not.toBeInTheDocument()
  })

  it('поле readOnly по умолчанию', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ x: 1, result: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Calculated name="result" label="Результат" compute={(v) => Number(v.x) * 2} />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      // Нет input элемента — только Text для отображения
      expect(screen.getByTestId('calculated-value')).toBeInTheDocument()
      // Не должно быть editable input
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
    })
  })

  it('вычисленное значение доступно при submit', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={{ a: 5, b: 3, sum: 0 }} onSubmit={onSubmit}>
          <Form.Field.Number name="a" label="A" />
          <Form.Field.Number name="b" label="B" />
          <Form.Field.Calculated name="sum" label="Сумма" compute={(v) => (Number(v.a) || 0) + (Number(v.b) || 0)} />
          <Form.Button.Submit>Отправить</Form.Button.Submit>
        </Form>
      </TestWrapper>,
    )

    // Ждём вычисления
    await waitFor(() => {
      expect(screen.getByTestId('calculated-value')).toHaveTextContent('8')
    })

    // Отправляем форму
    await user.click(screen.getByText('Отправить'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
      const submittedValues = onSubmit.mock.calls[0][0]
      expect(submittedValues.sum).toBe(8)
    })
  })

  it('пересчитывает при изменении зависимого поля', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form initialValue={{ price: 10, qty: 1, total: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Number name="price" label="Цена" />
          <Form.Field.Number name="qty" label="Кол-во" />
          <Form.Field.Calculated
            name="total"
            label="Итого"
            compute={(v) => (Number(v.price) || 0) * (Number(v.qty) || 0)}
            deps={['price', 'qty']}
          />
        </Form>
      </TestWrapper>,
    )

    // Начальное: 10 * 1 = 10
    await waitFor(() => {
      expect(screen.getByTestId('calculated-value')).toHaveTextContent('10')
    })

    // Очищаем qty и вводим 5
    const qtyInput = screen.getByLabelText('Кол-во')
    await user.clear(qtyInput)
    await user.type(qtyInput, '5')

    // Теперь: 10 * 5 = 50
    await waitFor(() => {
      expect(screen.getByTestId('calculated-value')).toHaveTextContent('50')
    })
  })

  it('работает внутри Form.Group', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ order: { price: 100, qty: 2, total: 0 } }} onSubmit={vi.fn()}>
          <Form.Group name="order">
            <Form.Field.Number name="price" label="Цена" />
            <Form.Field.Number name="qty" label="Кол-во" />
            <Form.Field.Calculated
              name="total"
              label="Итого"
              compute={(v) => {
                const order = v.order as Record<string, unknown>
                return (Number(order?.price) || 0) * (Number(order?.qty) || 0)
              }}
            />
          </Form.Group>
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('calculated-value')).toHaveTextContent('200')
    })
  })

  it('отображает label', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ x: 1, result: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Calculated name="result" label="Мой результат" compute={(v) => Number(v.x)} />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Мой результат')).toBeInTheDocument()
    })
  })
})
