import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { fireEvent, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Form } from '../../index'

const Wrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

/**
 * Баг (2026-08-18, aboi): TableEditor коммитил значение ячейки только через нативный DOM blur.
 * Клавиатурный выход (Tab/Enter/стрелки) размонтировал <Input> напрямую через
 * setEditingCell(null), минуя blur, — введённое значение терялось молча.
 */
describe('TableEditor клавиатурная навигация коммитит значение', () => {
  function renderTable() {
    return render(
      <Wrapper>
        <Form
          initialValue={{
            items: [
              { product: 'Квадрат 91×91', price: 2490 },
              { product: 'Круг', price: 1000 },
            ],
          }}
          onSubmit={() => {}}
        >
          <Form.Field.TableEditor
            name="items"
            columns={[
              { name: 'product', label: 'Товар', width: '60%' },
              { name: 'price', label: 'Цена, ₽', width: '40%', fieldType: 'number' },
            ]}
          />
        </Form>
      </Wrapper>,
    )
  }

  it('Tab коммитит значение вместо отката к предыдущему', async () => {
    const user = userEvent.setup()
    const { container } = renderTable()

    await waitFor(() => {
      expect(container.innerHTML).toContain('2490')
    })

    // Десктопная таблица (мобильная скрыта через display base/md)
    const desktopTable = container.querySelector('table')
    expect(desktopTable).toBeTruthy()

    const priceCell = desktopTable!.querySelector('[data-row="0"][data-col="1"]') as HTMLElement
    fireEvent.click(priceCell)

    const input = desktopTable!.querySelector('td[data-row="0"][data-col="1"] input') as HTMLInputElement
    expect(input).toBeTruthy()

    await user.clear(input)
    await user.type(input, '2500')
    await user.tab()

    await waitFor(() => {
      expect(desktopTable!.textContent).toContain('2500')
      expect(desktopTable!.textContent).not.toContain('2490')
    })
  })

  it('Escape отменяет редактирование и не коммитит значение', async () => {
    const user = userEvent.setup()
    const { container } = renderTable()

    await waitFor(() => {
      expect(container.innerHTML).toContain('2490')
    })

    const desktopTable = container.querySelector('table')
    const priceCell = desktopTable!.querySelector('[data-row="0"][data-col="1"]') as HTMLElement
    fireEvent.click(priceCell)

    const input = desktopTable!.querySelector('td[data-row="0"][data-col="1"] input') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '9999')
    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(desktopTable!.textContent).toContain('2490')
      expect(desktopTable!.textContent).not.toContain('9999')
    })
  })
})
