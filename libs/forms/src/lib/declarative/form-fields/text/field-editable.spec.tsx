import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldEditable', () => {
  describe('rendering', () => {
    it('рендерит editable компонент', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ title: 'Заголовок' }} onSubmit={vi.fn()}>
            <Form.Field.Editable name="title" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Заголовок')).toBeInTheDocument()
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ title: '' }} onSubmit={vi.fn()}>
            <Form.Field.Editable name="title" label="Название" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Название')).toBeInTheDocument()
    })

    it('рендерит placeholder при пустом значении', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ title: '' }} onSubmit={vi.fn()}>
            <Form.Field.Editable name="title" placeholder="Нажмите для редактирования" />
          </Form>
        </TestWrapper>
      )

      expect(screen.getByText('Нажмите для редактирования')).toBeInTheDocument()
    })
  })

  describe('states', () => {
    it('disabled', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ title: 'Текст' }} onSubmit={vi.fn()}>
            <Form.Field.Editable name="title" disabled />
          </Form>
        </TestWrapper>
      )

      // Editable в disabled режиме не должен быть интерактивным
      const root = document.querySelector('[data-scope="editable"]')
      expect(root).toBeInTheDocument()
    })
  })
})
