import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { vi } from 'vitest'
import { FieldString } from './form-fields'
import { Form } from './form-root'

// Обёртка для тестов с Chakra UI
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('Form Middleware Integration', () => {
  it('должен рендерить форму с middleware', async () => {
    render(
      <TestWrapper>
        <Form
          initialValue={{ name: 'Test' }}
          onSubmit={vi.fn()}
          middleware={{
            beforeSubmit: (data) => data,
            afterSuccess: vi.fn(),
            onError: vi.fn(),
          }}
        >
          <FieldString name="name" label="Имя" />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Имя')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument()
    })
  })

  it('должен принимать пустой объект middleware', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ name: '' }} onSubmit={vi.fn()} middleware={{}}>
          <FieldString name="name" label="Имя" />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Имя')).toBeInTheDocument()
    })
  })

  it('должен принимать undefined middleware', async () => {
    render(
      <TestWrapper>
        <Form initialValue={{ name: '' }} onSubmit={vi.fn()} middleware={undefined}>
          <FieldString name="name" label="Имя" />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Имя')).toBeInTheDocument()
    })
  })

  it('должен работать с частичным middleware (только beforeSubmit)', async () => {
    render(
      <TestWrapper>
        <Form
          initialValue={{ name: '' }}
          onSubmit={vi.fn()}
          middleware={{
            beforeSubmit: (data) => ({ ...data, transformed: true }),
          }}
        >
          <FieldString name="name" label="Имя" />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Имя')).toBeInTheDocument()
    })
  })

  it('должен работать с частичным middleware (только afterSuccess)', async () => {
    render(
      <TestWrapper>
        <Form
          initialValue={{ name: '' }}
          onSubmit={vi.fn()}
          middleware={{
            afterSuccess: vi.fn(),
          }}
        >
          <FieldString name="name" label="Имя" />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Имя')).toBeInTheDocument()
    })
  })

  it('должен работать с частичным middleware (только onError)', async () => {
    render(
      <TestWrapper>
        <Form
          initialValue={{ name: '' }}
          onSubmit={vi.fn()}
          middleware={{
            onError: vi.fn(),
          }}
        >
          <FieldString name="name" label="Имя" />
        </Form>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByText('Имя')).toBeInTheDocument()
    })
  })
})
