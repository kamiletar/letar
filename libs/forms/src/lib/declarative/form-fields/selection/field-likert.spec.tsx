import { ChakraProvider, defaultSystem } from '@chakra-ui/react'
import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { Form } from '../../'

const TestWrapper = ({ children }: { children: ReactNode }) => (
  <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
)

describe('FieldLikert', () => {
  describe('рендеринг', () => {
    it('рендерит шкалу с label', () => {
      render(
        <Form initialValue={{ satisfaction: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Likert name="satisfaction" label="Удовлетворённость" anchors={['Плохо', 'Средне', 'Отлично']} />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Удовлетворённость')).toBeInTheDocument()
    })
  })

  describe('состояния', () => {
    it('рендерит helperText', () => {
      render(
        <Form initialValue={{ satisfaction: 0 }} onSubmit={vi.fn()}>
          <Form.Field.Likert name="satisfaction" anchors={['1', '2', '3', '4', '5']} helperText="Оцените от 1 до 5" />
        </Form>,
        { wrapper: TestWrapper },
      )

      expect(screen.getByText('Оцените от 1 до 5')).toBeInTheDocument()
    })
  })
})
