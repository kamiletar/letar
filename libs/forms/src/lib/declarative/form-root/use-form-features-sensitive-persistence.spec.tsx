import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Form } from '../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const STORAGE_KEY = 'form-persistence:edit-intent-persistence-test'

describe('persistence + EditIntentValue — реестр чувствительных полей', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
  })

  it('не сохраняет apiKey.value в localStorage, но сохраняет остальные поля', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <Form
          initialValue={{ name: '', apiKey: { isEdited: true, value: '' } }}
          onSubmit={vi.fn()}
          persistence={{ key: 'edit-intent-persistence-test', debounceMs: 0 }}
        >
          <Form.Field.String name="name" label="Имя" />
          <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="">
            <Form.Field.String name="apiKey.value" label="Ключ" />
          </Form.Field.EditIntent>
        </Form>
      </TestWrapper>,
    )

    await act(async () => {
      await user.type(screen.getByLabelText('Имя'), 'Иван')
      await user.type(screen.getByLabelText('Ключ'), 'sk-real-secret')
    })

    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).not.toBeNull()
    expect(stored).not.toContain('sk-real-secret')
    expect(stored).toContain('Иван')
  })
})
