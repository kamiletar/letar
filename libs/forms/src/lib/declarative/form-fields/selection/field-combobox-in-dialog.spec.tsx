import { ChakraProvider, defaultSystem, Dialog, Portal } from '@chakra-ui/react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
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

/** Модальный диалог с полем: список рисуется в Portal вне диалога (FM-015, как FM-014 у Select). */
function renderInDialog(field: ReactNode, initialValue: Record<string, string>) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <Dialog.Root open>
        <Portal>
          <Dialog.Positioner>
            <Dialog.Content>
              <Dialog.Body>
                <Form initialValue={initialValue} onSubmit={vi.fn()}>
                  {field}
                </Form>
              </Dialog.Body>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    </ChakraProvider>,
  )
}

describe('Field.Combobox внутри модального диалога (FM-015)', () => {
  it('опции открытого списка доступны по роли', async () => {
    const user = userEvent.setup()
    renderInDialog(<Form.Field.Combobox name="color" label="Цвет" options={options} minChars={0} />, { color: '' })

    await user.click(await screen.findByRole('combobox'))

    expect(await screen.findByRole('option', { name: 'Зелёный' })).toBeInTheDocument()
  })

  it('выбор мышью меняет значение, диалог остаётся открытым', async () => {
    const user = userEvent.setup()
    renderInDialog(<Form.Field.Combobox name="color" label="Цвет" options={options} minChars={0} />, { color: '' })

    await user.click(await screen.findByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Зелёный' }))

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Зелёный'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('Field.Autocomplete внутри модального диалога (FM-015)', () => {
  it('подсказки доступны по роли, выбор мышью меняет значение', async () => {
    const user = userEvent.setup()
    renderInDialog(<Form.Field.Autocomplete name="city" label="Город" suggestions={['Москва', 'Мурманск']} />, {
      city: '',
    })

    await user.click(await screen.findByRole('combobox'))
    await user.click(await screen.findByRole('option', { name: 'Мурманск' }))

    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('Мурманск'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
