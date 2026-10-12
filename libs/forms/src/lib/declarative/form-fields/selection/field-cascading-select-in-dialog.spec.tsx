import { ChakraProvider, defaultSystem, Dialog, Portal } from '@chakra-ui/react'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

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

/** Модальный диалог с полем: список рисуется в Portal вне диалога (FM-016, как FM-014 у Select). */
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

describe('Field.CascadingSelect внутри модального диалога (FM-016)', () => {
  it('опции открытого списка доступны по роли, выбор мышью меняет значение', async () => {
    const user = userEvent.setup()
    const loadOptions = vi.fn(async () => [
      { label: 'Москва', value: 'msk' },
      { label: 'Мурманск', value: 'mur' },
    ])
    renderInDialog(
      <>
        <Form.Field.String name="country" label="Страна" />
        <Form.Field.CascadingSelect name="city" label="Город" dependsOn="country" loadOptions={loadOptions} />
      </>,
      { country: 'ru', city: '' },
    )

    await waitFor(() => expect(loadOptions).toHaveBeenCalled())
    await user.click(await screen.findByRole('combobox', { name: /Город/ }))
    await user.click(await screen.findByRole('option', { name: 'Мурманск' }))

    await waitFor(() => expect(screen.getByRole('combobox', { name: /Город/ })).toHaveTextContent('Мурманск'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
