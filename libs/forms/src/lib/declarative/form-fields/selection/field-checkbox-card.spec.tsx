import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

const options = [
  { label: 'Базовый', value: 'basic', description: 'Для новичков' },
  { label: 'Продвинутый', value: 'advanced', description: 'Для опытных' },
  { label: 'Эксперт', value: 'expert', description: 'Для профессионалов' },
]

describe('FieldCheckboxCard', () => {
  describe('rendering', () => {
    it('рендерит checkbox group', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ plans: [] }} onSubmit={vi.fn()}>
            <Form.Field.CheckboxCard name="plans" options={options} />
          </Form>
        </TestWrapper>,
      )

      const checkboxes = screen.getAllByRole('checkbox')
      expect(checkboxes.length).toBe(3)
    })

    it('рендерит label', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ plans: [] }} onSubmit={vi.fn()}>
            <Form.Field.CheckboxCard name="plans" label="Тарифы" options={options} />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('Тарифы')).toBeInTheDocument()
    })

    it('рендерит опции с описаниями', () => {
      render(
        <TestWrapper>
          <Form initialValue={{ plans: [] }} onSubmit={vi.fn()}>
            <Form.Field.CheckboxCard name="plans" options={options} />
          </Form>
        </TestWrapper>,
      )

      expect(screen.getByText('Базовый')).toBeInTheDocument()
      expect(screen.getByText('Для новичков')).toBeInTheDocument()
      expect(screen.getByText('Продвинутый')).toBeInTheDocument()
    })
  })
})
