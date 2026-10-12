import { ChakraProvider, defaultSystem, Dialog, Portal } from '@chakra-ui/react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const options = [
  { value: 'red', label: 'Красный' },
  { value: 'green', label: 'Зелёный' },
]

beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
  Element.prototype.scrollTo = vi.fn()
  Element.prototype.scrollIntoView = vi.fn()
})

afterEach(cleanup)

/** Модальный диалог с Select: список рисуется в Portal вне диалога (FM-014). */
function renderInDialog() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <Dialog.Root open>
        <Portal>
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Body>
                <Form initialValue={{ color: '' }} onSubmit={vi.fn()}>
                  <Form.Field.Select name="color" label="Цвет" options={options} />
                </Form>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </ChakraProvider>,
  )
}

describe('Field.Select внутри модального диалога (FM-014)', () => {
  it('опции открытого списка доступны по роли, а не скрыты aria-hidden диалога', async () => {
    const user = userEvent.setup()
    renderInDialog()

    await user.click(await screen.findByRole('combobox'))

    expect(await screen.findByRole('option', { name: 'Зелёный' })).toBeInTheDocument()
  })

  it('выбор мышью меняет значение, диалог остаётся открытым', async () => {
    const user = userEvent.setup()
    renderInDialog()

    await user.click(await screen.findByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Зелёный' }))

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent('Зелёный'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('выбор клавиатурой: стрелка открывает список, Enter выбирает', async () => {
    const user = userEvent.setup()
    renderInDialog()

    screen.getByRole('combobox').focus()
    await user.keyboard('{ArrowDown}')
    await screen.findByRole('option', { name: 'Красный' })
    await user.keyboard('{ArrowDown}{Enter}')

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveTextContent(/Красный|Зелёный/))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
