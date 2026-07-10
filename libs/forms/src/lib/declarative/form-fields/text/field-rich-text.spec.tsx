import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldRichText', () => {
  describe('rendering', () => {
    it('рендерит rich text editor', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ content: '' }} onSubmit={vi.fn()}>
            <Form.Field.RichText name="content" />
          </Form>
        </TestWrapper>
      )

      // Tiptap рендерит contenteditable div
      const editor = document.querySelector('[contenteditable]')
      expect(editor).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ content: '' }} onSubmit={vi.fn()}>
            <Form.Field.RichText name="content" label="Описание" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Описание')).toBeInTheDocument()
    })
  })
})
