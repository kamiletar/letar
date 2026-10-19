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
      expect(screen.getByText(/Иван/)).toBeInTheDocument()
    })

    expect(screen.queryByText(/sk-real-secret/)).not.toBeInTheDocument()
    expect(screen.getByText(/••••••••/)).toBeInTheDocument()
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
      expect(screen.getByText(/not-actually-secret/)).toBeInTheDocument()
    })
  })

  it('простой вариант — это <pre> с JSON значений, `collapsed` не ломает', async () => {
    const { container } = render(
      <TestWrapper>
        <Form initialValue={{ name: 'Иван', tags: ['a', 'b'] }} onSubmit={vi.fn()}>
          <Form.Field.String name="name" label="Имя" />
          <Form.DebugValues showInProduction collapsed={0} title="Значения" />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(container.querySelector('pre')).not.toBeNull()
    })
    const pre = container.querySelector('pre') as HTMLElement
    expect(JSON.parse(pre.textContent ?? '')).toEqual({ name: 'Иван', tags: ['a', 'b'] })
    expect(screen.getByText('Значения')).toBeInTheDocument()
  })

  it('проп debug у формы тоже рисует простой <pre>, без просмотрщика JSON', async () => {
    const { container } = render(
      <TestWrapper>
        <Form initialValue={{ name: 'Иван' }} onSubmit={vi.fn()} debug="force">
          <Form.Field.String name="name" label="Имя" />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(container.querySelector('pre')).not.toBeNull()
    })
    expect(container.querySelector('pre')?.textContent).toContain('"name": "Иван"')
  })
})
