import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod/v4'
import { FormFromSchema } from './form-from-schema'

// Wrapper for Chakra UI tests
const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// Simple test schema
const SimpleSchema = z.object({
  name: z.string().meta({ ui: { title: 'Name' } }),
  email: z
    .string()
    .email()
    .meta({ ui: { title: 'Email' } }),
})

// Schema with number field
const NumberSchema = z.object({
  title: z.string().meta({ ui: { title: 'Title' } }),
  age: z.number().meta({ ui: { title: 'Age' } }),
})

// Schema with boolean
const CheckboxSchema = z.object({
  name: z.string().meta({ ui: { title: 'Name' } }),
  agree: z.boolean().meta({ ui: { title: 'Agreement' } }),
})

describe('FormFromSchema', () => {
  describe('rendering', () => {
    it('renders form with auto-generated fields', async () => {
      render(
        <TestWrapper>
          <FormFromSchema schema={SimpleSchema} initialValue={{ name: '', email: '' }} onSubmit={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument()
        expect(screen.getByText('Email')).toBeInTheDocument()
      })
    })

    it('renders Submit button with default text', async () => {
      render(
        <TestWrapper>
          <FormFromSchema schema={SimpleSchema} initialValue={{ name: '', email: '' }} onSubmit={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      })
    })

    it('renders Submit button with custom text', async () => {
      render(
        <TestWrapper>
          <FormFromSchema
            schema={SimpleSchema}
            initialValue={{ name: '', email: '' }}
            onSubmit={vi.fn()}
            submitLabel="Create"
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument()
      })
    })

    it('does not render Reset button by default', async () => {
      render(
        <TestWrapper>
          <FormFromSchema schema={SimpleSchema} initialValue={{ name: '', email: '' }} onSubmit={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument()
      })
    })

    it('renders Reset button when showReset=true', async () => {
      render(
        <TestWrapper>
          <FormFromSchema schema={SimpleSchema} initialValue={{ name: '', email: '' }} onSubmit={vi.fn()} showReset />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument()
      })
    })

    it('renders Reset button with custom text', async () => {
      render(
        <TestWrapper>
          <FormFromSchema
            schema={SimpleSchema}
            initialValue={{ name: '', email: '' }}
            onSubmit={vi.fn()}
            showReset
            resetLabel="Cancel"
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      })
    })
  })

  describe('exclude prop', () => {
    it('excludes fields from rendering', async () => {
      render(
        <TestWrapper>
          <FormFromSchema
            schema={SimpleSchema}
            initialValue={{ name: '', email: '' }}
            onSubmit={vi.fn()}
            exclude={['email']}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument()
        expect(screen.queryByText('Email')).not.toBeInTheDocument()
      })
    })

    it('excludes multiple fields', async () => {
      const Schema = z.object({
        a: z.string().meta({ ui: { title: 'A' } }),
        b: z.string().meta({ ui: { title: 'B' } }),
        c: z.string().meta({ ui: { title: 'C' } }),
      })

      render(
        <TestWrapper>
          <FormFromSchema
            schema={Schema}
            initialValue={{ a: '', b: '', c: '' }}
            onSubmit={vi.fn()}
            exclude={['a', 'c']}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.queryByText('A')).not.toBeInTheDocument()
        expect(screen.getByText('B')).toBeInTheDocument()
        expect(screen.queryByText('C')).not.toBeInTheDocument()
      })
    })
  })

  describe('initial values', () => {
    it('displays initial values in fields', async () => {
      render(
        <TestWrapper>
          <FormFromSchema
            schema={SimpleSchema}
            initialValue={{ name: 'John', email: 'john@test.com' }}
            onSubmit={vi.fn()}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('John')).toBeInTheDocument()
        expect(screen.getByDisplayValue('john@test.com')).toBeInTheDocument()
      })
    })
  })

  describe('submit', () => {
    it('calls onSubmit when form is submitted', async () => {
      const onSubmit = vi.fn()

      render(
        <TestWrapper>
          <FormFromSchema
            schema={SimpleSchema}
            initialValue={{ name: 'Test', email: 'test@test.com' }}
            onSubmit={onSubmit}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      })

      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            name: 'Test',
            email: 'test@test.com',
          })
        )
      })
    })

    it('handles async onSubmit', async () => {
      const onSubmit = vi.fn().mockResolvedValue(undefined)

      render(
        <TestWrapper>
          <FormFromSchema
            schema={SimpleSchema}
            initialValue={{ name: 'Async', email: 'async@test.com' }}
            onSubmit={onSubmit}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument()
      })

      await userEvent.click(screen.getByRole('button', { name: 'Save' }))

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled()
      })
    })
  })

  describe('disabled/readOnly', () => {
    it('disables all fields when disabled=true', async () => {
      render(
        <TestWrapper>
          <FormFromSchema schema={SimpleSchema} initialValue={{ name: '', email: '' }} onSubmit={vi.fn()} disabled />
        </TestWrapper>
      )

      await waitFor(() => {
        const inputs = screen.getAllByRole('textbox')
        inputs.forEach((input) => {
          expect(input).toBeDisabled()
        })
      })
    })
  })

  describe('beforeButtons/afterButtons slots', () => {
    it('renders beforeButtons before buttons', async () => {
      render(
        <TestWrapper>
          <FormFromSchema
            schema={SimpleSchema}
            initialValue={{ name: '', email: '' }}
            onSubmit={vi.fn()}
            beforeButtons={<div data-testid="before-buttons">Before Content</div>}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('before-buttons')).toBeInTheDocument()
      })
    })

    it('renders afterButtons after buttons', async () => {
      render(
        <TestWrapper>
          <FormFromSchema
            schema={SimpleSchema}
            initialValue={{ name: '', email: '' }}
            onSubmit={vi.fn()}
            afterButtons={<div data-testid="after-buttons">After Content</div>}
          />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByTestId('after-buttons')).toBeInTheDocument()
      })
    })
  })

  describe('different field types', () => {
    it('renders number fields', async () => {
      render(
        <TestWrapper>
          <FormFromSchema schema={NumberSchema} initialValue={{ title: '', age: 25 }} onSubmit={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument()
        expect(screen.getByText('Age')).toBeInTheDocument()
      })
    })

    it('renders boolean fields as checkbox', async () => {
      render(
        <TestWrapper>
          <FormFromSchema schema={CheckboxSchema} initialValue={{ name: '', agree: false }} onSubmit={vi.fn()} />
        </TestWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Name')).toBeInTheDocument()
        expect(screen.getByText('Agreement')).toBeInTheDocument()
      })
    })
  })

  describe('displayName', () => {
    it('has correct displayName', () => {
      expect(FormFromSchema.displayName).toBe('FormFromSchema')
    })
  })
})
