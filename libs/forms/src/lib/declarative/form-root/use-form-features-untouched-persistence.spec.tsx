import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Form } from '../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const KEY = 'untouched-persistence-test'
const STORAGE_KEY = `form-persistence:${KEY}`

function renderForm() {
  return render(
    <TestWrapper>
      <Form initialValue={{ name: 'Исходное' }} onSubmit={vi.fn()} persistence={{ key: KEY, debounceMs: 0 }}>
        <Form.Field.String name="name" label="Имя" />
      </Form>
    </TestWrapper>,
  )
}

describe('persistence — форма без правок не оставляет черновик', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('фокус и blur без изменения значения не пишут черновик', async () => {
    const user = userEvent.setup()
    renderForm()

    await act(async () => {
      await user.click(screen.getByLabelText('Имя'))
      await user.tab()
    })

    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
  })

  it('реальная правка по-прежнему сохраняется', async () => {
    const user = userEvent.setup()
    renderForm()

    await act(async () => {
      await user.type(screen.getByLabelText('Имя'), ' плюс')
    })

    expect(localStorage.getItem(STORAGE_KEY)).toContain('Исходное плюс')
  })
})
