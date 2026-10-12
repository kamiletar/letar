import { ChakraProvider, defaultSystem, Dialog, Portal } from '@chakra-ui/react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

describe('Field.DateRange внутри модального диалога (FM-016)', () => {
  it('пункты меню пресетов доступны по роли (Menu монтируется лениво по умолчанию)', async () => {
    const user = userEvent.setup()
    render(
      <ChakraProvider value={defaultSystem}>
        <Dialog.Root open>
          <Portal>
            <Dialog.Positioner>
              <Dialog.Content>
                <Dialog.Body>
                  <Form initialValue={{ period: { start: '', end: '' } }} onSubmit={vi.fn()}>
                    <Form.Field.DateRange name="period" label="Период" presets={['today', 'thisMonth']} />
                  </Form>
                </Dialog.Body>
              </Dialog.Content>
            </Dialog.Positioner>
          </Portal>
        </Dialog.Root>
      </ChakraProvider>,
    )

    await user.click(await screen.findByRole('button', { name: /Presets/ }))

    expect((await screen.findAllByRole('menuitem')).length).toBe(2)
  })
})
