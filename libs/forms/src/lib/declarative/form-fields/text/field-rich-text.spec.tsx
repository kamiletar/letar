import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

// FieldRichText загружается лениво (lazy() + dynamic import) — реализация с @tiptap/*
// резолвится асинхронно, поэтому проверки после render() требуют waitFor/findBy.
describe('FieldRichText', () => {
  describe('rendering', () => {
    it('рендерит rich text editor', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ content: '' }} onSubmit={vi.fn()}>
            <Form.Field.RichText name="content" />
          </Form>
        </TestWrapper>,
      )

      // Tiptap рендерит contenteditable div
      await waitFor(() => {
        expect(document.querySelector('[contenteditable]')).toBeInTheDocument()
      })
    })

    it('рендерит label', async () => {
      render(
        <TestWrapper>
          <Form initialValue={{ content: '' }} onSubmit={vi.fn()}>
            <Form.Field.RichText name="content" label="Описание" />
          </Form>
        </TestWrapper>,
      )

      expect(await screen.findByText('Описание')).toBeInTheDocument()
    })
  })
})
