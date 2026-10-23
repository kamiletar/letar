import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'

import { Form } from '../'

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

function renderSteps(linear = false, clickable = true) {
  return render(
    <Form
      schema={z.object({ name: z.string().min(1, 'Укажите имя') }).strip()}
      initialValue={{ name: '' }}
      onSubmit={vi.fn()}
    >
      <Form.Steps linear={linear}>
        <Form.Steps.Indicator clickable={clickable} />
        <Form.Steps.Step title="Контакты">
          <Form.Field.String name="name" label="Имя" />
        </Form.Steps.Step>
        <Form.Steps.Step title="Доставка">
          <p>Способ доставки</p>
        </Form.Steps.Step>
        <Form.Steps.Navigation nextLabel="Далее" prevLabel="Назад" />
      </Form.Steps>
    </Form>,
    { wrapper: TestWrapper },
  )
}

describe('FormStepsIndicator — доступная структура и навигация', () => {
  it.each([
    { linear: false, clickable: true },
    { linear: true, clickable: true },
    { linear: false, clickable: false },
  ])('tablist содержит вкладки без доступных обёрток: $linear/$clickable', ({ linear, clickable }) => {
    renderSteps(linear, clickable)
    const list = screen.getByRole('tablist')
    expect(within(list).getAllByRole('tab')).toHaveLength(2)
    expect(within(list).queryAllByRole('listitem')).toHaveLength(0)
    expect([...list.children].every((child) => child.getAttribute('role') === 'presentation')).toBe(true)
    expect([...list.children].every((child) => !child.hasAttribute('aria-current'))).toBe(true)
    expect(screen.getByRole('tab', { name: 'Контакты' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel', { name: 'Контакты' })).toBeVisible()
  })

  it.each([
    { linear: true, clickable: true },
    { linear: false, clickable: false },
  ])('не позволяет обходить навигацию заблокированной вкладкой: $linear/$clickable', async ({ linear, clickable }) => {
    const user = userEvent.setup()
    renderSteps(linear, clickable)
    const delivery = screen.getByRole('tab', { name: 'Доставка' })
    expect(delivery).toBeDisabled()
    await user.click(delivery)
    expect(screen.getByText('Способ доставки')).not.toBeVisible()
  })

  it('сохраняет переходы по вкладкам с клавиатуры и обратно', async () => {
    const user = userEvent.setup()
    renderSteps()
    const delivery = screen.getByRole('tab', { name: 'Доставка' })
    delivery.focus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(delivery).toHaveAttribute('aria-selected', 'true'))
    expect(screen.getByText('Способ доставки')).toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Контакты' }))
    await waitFor(() => expect(screen.getByRole('textbox')).toBeVisible())
  })

  it('линейная навигация по-прежнему проверяет обязательные поля', async () => {
    const user = userEvent.setup()
    renderSteps(true)
    await user.click(screen.getByRole('button', { name: 'Далее' }))
    await waitFor(() => expect(screen.getByText('Способ доставки')).not.toBeVisible())
    await user.type(screen.getByRole('textbox'), 'Ками')
    await user.click(screen.getByRole('button', { name: 'Далее' }))
    await waitFor(() => expect(screen.getByText('Способ доставки')).toBeVisible())
  })
})
