import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Form } from './'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('Form.DebugValues — редакция чувствительных полей', () => {
  it('маскирует значение Form.Field.EditIntent (sensitive по умолчанию), не трогая остальные поля', async () => {
    render(
      <TestWrapper>
        <Form
          initialValue={{ name: 'Иван', apiKey: { isEdited: true, value: 'sk-real-secret' } }}
          onSubmit={vi.fn()}
        >
          <Form.Field.String name="name" label="Имя" />
          <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="">
            <Form.Field.String name="apiKey.value" label="Ключ" />
          </Form.Field.EditIntent>
          <Form.DebugValues showInProduction />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Иван')).toBeInTheDocument()
    })

    expect(screen.queryByText('sk-real-secret')).not.toBeInTheDocument()
    expect(screen.getByText('••••••••')).toBeInTheDocument()
  })

  it('sensitive: false — значение видно в дебаг-инспекторе как есть', async () => {
    render(
      <TestWrapper>
        <Form
          initialValue={{ apiKey: { isEdited: true, value: 'not-actually-secret' } }}
          onSubmit={vi.fn()}
        >
          <Form.Field.EditIntent name="apiKey" displayValue="****" emptyValue="" sensitive={false}>
            <Form.Field.String name="apiKey.value" label="Значение" />
          </Form.Field.EditIntent>
          <Form.DebugValues showInProduction />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('not-actually-secret')).toBeInTheDocument()
    })
  })
})
